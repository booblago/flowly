"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  CalendarDays,
  Plus,
  Search,
  Workflow,
} from "lucide-react";
import { format } from "date-fns";
import type { Activity, Board, Card, List, Priority, PublicUser } from "@/lib/types";
import { cn, initials, localDayKey, uid, userImageSrc } from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";
import { CardModal } from "./CardModal";
import { SortableList } from "./BoardLists";

type Props = {
  board: Board;
  lists: List[];
  cards: Card[];
  members: PublicUser[];
  activities: Activity[];
};

export function BoardView({
  board: initialBoard,
  lists: initialLists,
  cards: initialCards,
  members,
  activities: initialActivities,
}: Props) {
  const t = useT();
  const dndId = useId();
  const [board] = useState(initialBoard);
  const [lists, setLists] = useState(
    [...initialLists].sort((a, b) => a.position - b.position),
  );
  const [cards, setCards] = useState(initialCards);
  const [activities, setActivities] = useState(initialActivities);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);
  const [selected, setSelected] = useState<Card | null>(null);
  const [query, setQuery] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [toast, setToast] = useState("");
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const completeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const timers = completeTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const syncFingerprint = useRef("");
  const draggingRef = useRef(false);
  const dragOriginRef = useRef<{
    cardId: string;
    listId: string;
    position: number;
  } | null>(null);
  const pendingCompleteRef = useRef<Set<string>>(new Set());

  function mergeActivities(server: Activity[], local: Activity[]): Activity[] {
    const serverIds = new Set(server.map((a) => a.id));
    const pending = local.filter((a) => {
      if (serverIds.has(a.id)) return false;
      const age = Date.now() - new Date(a.createdAt).getTime();
      if (age > 25_000) return false;
      return !server.some(
        (s) =>
          s.message === a.message &&
          Math.abs(
            new Date(s.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ) < 30_000,
      );
    });
    return [...pending, ...server].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  // Soft live sync — never clobber in-flight drag; merge activities
  useEffect(() => {
    let cancelled = false;
    async function softSync() {
      try {
        if (draggingRef.current || pendingCompleteRef.current.size > 0) return;
        const bundle = await fetch(`/api/boards/${board.id}`).then((r) =>
          r.json(),
        );
        if (cancelled || draggingRef.current) return;
        const acts = Array.isArray(bundle.activities) ? bundle.activities : null;
        const nextCards = Array.isArray(bundle.cards) ? bundle.cards : null;
        const fp = JSON.stringify({
          a: acts?.map((x: Activity) => x.id) ?? null,
          c:
            nextCards?.map(
              (x: Card) =>
                `${x.id}:${x.completedAt ?? ""}:${x.listId}:${x.position}:${x.priority}`,
            ) ?? null,
        });
        if (fp === syncFingerprint.current) return;
        syncFingerprint.current = fp;
        if (acts) {
          setActivities((prev) => mergeActivities(acts, prev));
        }
        if (nextCards && !draggingRef.current) {
          setCards(nextCards);
        }
      } catch {
        /* ignore */
      }
    }
    const id = window.setInterval(softSync, 9000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [board.id]);

  function bumpActivity(message: string) {
    setActivities((prev) => [
      {
        id: uid("act"),
        boardId: board.id,
        userId: "me",
        message,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
  );

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [cards, query]);

  function cardsInList(listId: string) {
    return filteredCards
      .filter((c) => c.listId === listId)
      .sort((a, b) => a.position - b.position);
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  async function refreshBoard() {
    const bundle = await fetch(`/api/boards/${board.id}`).then((r) => r.json());
    if (bundle.cards) setCards(bundle.cards);
    if (bundle.activities) {
      setActivities((prev) => mergeActivities(bundle.activities, prev));
    }
  }

  function cancelPendingComplete(cardId: string) {
    const timer = completeTimers.current.get(cardId);
    if (timer) clearTimeout(timer);
    completeTimers.current.delete(cardId);
    setCompletingIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }

  async function toggleComplete(card: Card) {
    if (completingIds.has(card.id)) return;
    cancelPendingComplete(card.id);
    setCompletingIds((prev) => new Set(prev).add(card.id));
    pendingCompleteRef.current.add(card.id);
    const complete = !card.completedAt;
    const prevCompletedAt = card.completedAt;
    // Optimistic card state only — bump chart after server OK (no phantom / no snap)
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              completedAt: complete ? new Date().toISOString() : null,
            }
          : c,
      ),
    );
    try {
      const res = await fetch("/api/cards/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, complete }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id ? { ...c, completedAt: prevCompletedAt } : c,
          ),
        );
        flash(data.error || t("completeFailed"));
        return;
      }
      const data = (await res.json()) as { card?: Card };
      if (data.card) {
        setCards((prev) =>
          prev.map((c) => (c.id === data.card!.id ? data.card! : c)),
        );
      }
      bumpActivity(
        complete
          ? `completed card "${card.title}"`
          : `reopened card "${card.title}"`,
      );
      flash(complete ? t("completeDone") : t("markIncomplete"));
    } finally {
      pendingCompleteRef.current.delete(card.id);
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }
  }

  async function removeCard(cardId: string, title: string) {
    const ok = window.confirm(t("deleteCardConfirm").replace("{name}", title));
    if (!ok) return;
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      flash(data.error || t("saveFailed"));
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (selected?.id === cardId) setSelected(null);
    bumpActivity(`deleted card "${title}"`);
  }

  async function moveCardToList(cardId: string, listId: string) {
    const card = cards.find((c) => c.id === cardId);
    const listCards = cards
      .filter((c) => c.listId === listId && c.id !== cardId)
      .sort((a, b) => a.position - b.position);
    const position = listCards.length;
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              listId,
              position,
              enteredListAt: new Date().toISOString(),
            }
          : c,
      ),
    );
    if (card) bumpActivity(`moved card "${card.title}"`);
    await persistMove(cardId, listId, position);
  }

  async function persistMove(cardId: string, listId: string, position: number) {
    const res = await fetch("/api/cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, listId, position }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error || t("moveBlocked"));
      const bundle = await fetch(`/api/boards/${board.id}`).then((r) => r.json());
      if (bundle.cards) setCards(bundle.cards);
      if (bundle.activities) setActivities(bundle.activities);
      return;
    }
    if (data.card) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...data.card } : c)),
      );
    }
  }

  function resolveListId(overId: string): string | null {
    if (overId.startsWith("drop-")) return overId.slice(5);
    if (lists.some((l) => l.id === overId)) return overId;
    const card = cards.find((c) => c.id === overId);
    return card?.listId ?? null;
  }

  function onDragStart(event: DragStartEvent) {
    draggingRef.current = true;
    const id = String(event.active.id);
    const list = lists.find((l) => l.id === id);
    if (list) {
      setActiveList(list);
      setActiveCard(null);
      dragOriginRef.current = null;
      return;
    }
    const card = cards.find((c) => c.id === id);
    if (card) {
      setActiveCard(card);
      setActiveList(null);
      dragOriginRef.current = {
        cardId: card.id,
        listId: card.listId,
        position: card.position,
      };
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    if (lists.some((l) => l.id === activeId)) return;
    const overId = String(over.id);

    setCards((prev) => {
      const activeCardItem = prev.find((c) => c.id === activeId);
      if (!activeCardItem) return prev;

      const dropListId = overId.startsWith("drop-") ? overId.slice(5) : overId;
      const overList =
        lists.find((l) => l.id === dropListId) ||
        lists.find((l) => l.id === overId) ||
        lists.find(
          (l) => l.id === prev.find((c) => c.id === overId)?.listId,
        );
      if (!overList) return prev;
      if (activeCardItem.listId === overList.id) return prev;

      const without = prev.filter((c) => c.id !== activeId);
      const overCards = without
        .filter((c) => c.listId === overList.id)
        .sort((a, b) => a.position - b.position);
      const overIndex = overCards.findIndex((c) => c.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : overCards.length;
      const moved = {
        ...activeCardItem,
        listId: overList.id,
        position: insertAt,
        enteredListAt: new Date().toISOString(),
      };
      const nextOver = [
        ...overCards.slice(0, insertAt),
        moved,
        ...overCards.slice(insertAt),
      ].map((c, i) => ({ ...c, position: i }));
      const others = without.filter((c) => c.listId !== overList.id);
      return [...others, ...nextOver];
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const origin = dragOriginRef.current;
    draggingRef.current = false;
    setActiveCard(null);
    setActiveList(null);
    dragOriginRef.current = null;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (lists.some((l) => l.id === activeId)) {
      const targetListId = resolveListId(overId);
      if (!targetListId || targetListId === activeId) return;
      const oldIndex = lists.findIndex((l) => l.id === activeId);
      const newIndex = lists.findIndex((l) => l.id === targetListId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = arrayMove(lists, oldIndex, newIndex).map((l, i) => ({
        ...l,
        position: i,
      }));
      setLists(next);
      bumpActivity("reordered lists");
      void fetch("/api/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          orderedIds: next.map((l) => l.id),
        }),
      }).then(async (res) => {
        if (!res.ok) {
          flash(t("saveFailed"));
          const bundle = await fetch(`/api/boards/${board.id}`).then((r) =>
            r.json(),
          );
          if (bundle.lists) setLists(bundle.lists);
        }
      });
      return;
    }

    const card = cards.find((c) => c.id === activeId);
    if (!card) return;
    const targetListId = resolveListId(overId);
    if (!targetListId) return;
    const overList = lists.find((l) => l.id === targetListId);
    if (!overList) return;

    const listCards = cards
      .filter((c) => c.listId === overList.id)
      .sort((a, b) => a.position - b.position);
    const oldIndex = listCards.findIndex((c) => c.id === activeId);
    let newIndex = listCards.findIndex((c) => c.id === overId);
    if (newIndex < 0) newIndex = Math.max(listCards.length - 1, 0);

    const changed =
      !origin ||
      origin.listId !== overList.id ||
      origin.position !== Math.max(newIndex, 0);

    if (!changed) return;

    if (oldIndex !== newIndex && oldIndex >= 0) {
      const reordered = arrayMove(listCards, oldIndex, newIndex).map((c, i) => ({
        ...c,
        position: i,
        listId: overList.id,
      }));
      setCards((prev) => [
        ...prev.filter((c) => c.listId !== overList.id),
        ...reordered,
      ]);
    }
    bumpActivity(`moved card "${card.title}"`);
    void persistMove(activeId, overList.id, Math.max(newIndex, 0));
  }

  async function addCard(listId: string, title: string) {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, boardId: board.id, title }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error || "Could not add card");
      return;
    }
    if (data.card) {
      setCards((prev) => [...prev, data.card]);
      setActivities((prev) => [
        {
          id: uid("act"),
          boardId: board.id,
          userId: "me",
          message: `created card "${title}"`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  }

  async function addList() {
    const title = newListTitle.trim();
    if (!title) {
      flash(t("boardNameRequired"));
      return;
    }
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: board.id, title }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      list?: List;
      error?: string;
    };
    if (!res.ok || !data.list) {
      flash(data.error || t("saveFailed"));
      return;
    }
    setLists((prev) => [...prev, data.list!]);
    setNewListTitle("");
    bumpActivity(`added list "${title}"`);
  }

  async function removeList(listId: string, title: string) {
    const ok = window.confirm(
      t("deleteListConfirm").replace("{name}", title),
    );
    if (!ok) return;
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(data.error || t("saveFailed"));
      return;
    }
    setLists((prev) => prev.filter((l) => l.id !== listId));
    setCards((prev) => prev.filter((c) => c.listId !== listId));
    bumpActivity(`deleted list "${title}"`);
  }

  async function saveCard(next: Card) {
    setCards((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    setSelected(next);
    bumpActivity(`updated card "${next.title}"`);
    await fetch(`/api/cards/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function setDefaultPriority(listId: string, defaultPriority: Priority) {
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, defaultPriority } : l)),
    );
    const list = lists.find((l) => l.id === listId);
    bumpActivity(`changed default priority on "${list?.title ?? "list"}"`);
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultPriority }),
    });
    const data = await res.json();
    if (data.list) {
      setLists((prev) => prev.map((l) => (l.id === listId ? data.list : l)));
    }
  }

  async function setCardPriority(cardId: string, priority: Priority) {
    const card = cards.find((c) => c.id === cardId);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, priority } : c)),
    );
    if (selected?.id === cardId) {
      setSelected({ ...selected, priority });
    }
    bumpActivity(`updated card "${card?.title ?? "card"}"`);
    await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
  }

  async function renameList(listId: string, title: string) {
    const prev = lists.find((l) => l.id === listId)?.title;
    setLists((curr) =>
      curr.map((l) => (l.id === listId ? { ...l, title } : l)),
    );
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      list?: List;
      error?: string;
    };
    if (!res.ok || !data.list) {
      if (prev != null) {
        setLists((curr) =>
          curr.map((l) => (l.id === listId ? { ...l, title: prev } : l)),
        );
      }
      flash(data.error || t("saveFailed"));
      return;
    }
    setLists((curr) =>
      curr.map((l) => (l.id === listId ? data.list! : l)),
    );
    bumpActivity(`renamed list to "${title}"`);
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-surface px-4 py-2 text-sm shadow-xl",
            toast === "completePending" || toast === t("completeDone")
              ? "border-brand/40 text-ink"
              : "border-rose/40 text-rose",
          )}
        >
          <span>
            {toast === "completePending" ? t("completePending") : toast}
          </span>
          {toast === "completePending" && completingIds.size > 0 && (
            <button
              type="button"
              className="font-semibold text-brand hover:underline"
              onClick={() => {
                const id = [...completingIds][0];
                if (id) cancelPendingComplete(id);
                setToast("");
              }}
            >
              {t("undo")}
            </button>
          )}
          {toast === t("completeDone") && (
            <Link href="/completed" className="font-semibold text-brand hover:underline">
              {t("completedTasks")}
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted">
            {t("board")} · {t("sla")} {board.slaDays}d
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">{board.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{board.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchCards")}
              className="rounded-full border border-[var(--line)] bg-surface py-2 pl-9 pr-4 text-sm outline-none ring-brand focus:ring-2"
            />
          </div>
          <Link
            href={`/board/${board.id}/automations`}
            className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium text-brand"
          >
            <Workflow className="h-4 w-4" />
            {t("automations")}
          </Link>
          <Link
            href={`/board/${board.id}/calendar`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-surface px-4 py-2 text-sm font-medium"
          >
            <CalendarDays className="h-4 w-4 text-accent" />
            {t("calendar")}
          </Link>
          <div className="flex -space-x-2">
            {members.map((m) => {
              const img = userImageSrc(m);
              return (
                <div
                  key={m.id}
                  title={m.name}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-paper text-[10px] font-bold text-black"
                  style={{
                    background: img.kind === "color" ? img.value : "#111113",
                  }}
                >
                  {img.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.value} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(m.name)
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="board-canvas overflow-hidden rounded-[28px] p-4">
          <div className="scrollbar-thin flex items-start gap-3 overflow-x-auto pb-2">
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={lists.map((l) => l.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex items-start gap-3">
                  {lists.map((list) => (
                    <SortableList
                      key={list.id}
                      list={list}
                      cards={cardsInList(list.id)}
                      allLists={lists}
                      board={board}
                      completingIds={completingIds}
                      onAddCard={addCard}
                      onOpenCard={setSelected}
                      onSetDefaultPriority={setDefaultPriority}
                      onSetCardPriority={setCardPriority}
                      onRenameList={renameList}
                      onToggleComplete={toggleComplete}
                      onDeleteList={() => void removeList(list.id, list.title)}
                      onDeleteCard={(card) =>
                        void removeCard(card.id, card.title)
                      }
                      onMoveCard={(cardId, listId) =>
                        void moveCardToList(cardId, listId)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeList ? (
                  <div
                    className="w-72 rounded-2xl border border-t-2 border-white/20 bg-surface p-3 shadow-2xl"
                    style={{ borderTopColor: activeList.accent }}
                  >
                    <div
                      className="text-sm font-semibold"
                      style={{ color: activeList.accent }}
                    >
                      {activeList.title}
                    </div>
                    <div className="mt-2 h-16 rounded-xl bg-black/30" />
                  </div>
                ) : activeCard ? (
                  <div className="w-64 rounded-2xl border border-brand/40 bg-[#111113] p-3 shadow-2xl">
                    <div className="text-sm font-semibold text-white">
                      {activeCard.title}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Outside DnD so clicks always work */}
            <form
              className="relative z-20 w-56 shrink-0 rounded-xl border border-dashed border-white/20 bg-black/40 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                void addList();
              }}
            >
              {lists.length === 0 && (
                <p className="mb-1.5 px-0.5 text-[11px] text-muted">
                  {t("emptyBoardHint")}
                </p>
              )}
              <input
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder={t("newListTitle")}
                className="w-full rounded-lg border border-white/15 bg-[#111113] px-2.5 py-1.5 text-xs text-white outline-none ring-brand focus:ring-1"
              />
              <button
                type="submit"
                className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-black hover:bg-zinc-100"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                {t("addList")}
              </button>
            </form>
          </div>
        </div>

        <aside className="flex max-h-[min(70vh,640px)] flex-col rounded-[28px] border border-[var(--line)] bg-surface p-3">
          <h2 className="font-display text-base font-bold">
            {t("boardActivityChart")}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">{t("boardActivityChartHint")}</p>

          <BoardPulseChart
            activities={activities}
            cards={cards}
            lists={lists}
            labels={{
              actions: t("chartActions"),
              open: t("chartOpenCards"),
              done: t("done"),
              active: t("pulseActive"),
              quiet: t("pulseQuiet"),
            }}
          />

          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("activity")}
            </h3>
            <span className="text-[10px] text-zinc-600">{t("scrollForMore")}</span>
          </div>
          <div className="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <p className="py-2 text-xs text-muted">{t("nothingHere")}</p>
            ) : (
              activities.map((a) => {
                const user = members.find((m) => m.id === a.userId);
                const isAuto = a.message.includes("automation");
                return (
                  <div
                    key={a.id}
                    className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-[11px] leading-snug"
                  >
                    <div>
                      <span
                        className={
                          isAuto ? "text-accent" : "font-semibold text-zinc-200"
                        }
                      >
                        {isAuto ? "⚡" : user?.name || t("someone")}
                      </span>{" "}
                      <span className="text-zinc-500">{a.message}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">
                      {format(new Date(a.createdAt), "MMM d · HH:mm")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {selected && (
        <CardModal
          card={selected}
          board={board}
          members={members}
          lists={lists}
          onClose={() => setSelected(null)}
          onSave={saveCard}
          onDelete={() => void removeCard(selected.id, selected.title)}
          onMove={(listId) => void moveCardToList(selected.id, listId)}
        />
      )}
    </div>
  );
}

function BoardPulseChart({
  activities,
  cards,
  lists,
  labels,
}: {
  activities: Activity[];
  cards: Card[];
  lists: List[];
  labels: {
    actions: string;
    open: string;
    done: string;
    active: string;
    quiet: string;
  };
}) {
  const days = useMemo(() => {
    const out: { key: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      out.push({
        key: localDayKey(d),
        label: format(d, "EE").slice(0, 2),
        count: 0,
      });
    }
    for (const a of activities) {
      const key = localDayKey(a.createdAt);
      const row = out.find((x) => x.key === key);
      if (row) row.count += 1;
    }
    return out;
  }, [activities]);

  const doneCount = cards.filter((c) => c.completedAt).length;
  const openCount = Math.max(cards.length - doneCount, 0);
  const listMax = Math.max(
    ...lists.map((l) => cards.filter((c) => c.listId === l.id).length),
    1,
  );
  const barMaxH = 72;
  // Soft asymptotic scale — every action nudges the bar up a little, never jumps
  const countSig = days.map((d) => d.count).join(",");
  const targetHeights = useMemo(
    () =>
      countSig.split(",").map((raw) => {
        const n = Number(raw) || 0;
        if (n <= 0) return 6;
        // Slow curve so busy days still creep up gently on each action
        const t = 1 - Math.exp(-n / 26);
        return Math.max(10, Math.round((6 + t * (barMaxH - 6)) * 10) / 10);
      }),
    [countSig],
  );

  return (
    <div className="mt-2 space-y-2.5">
      <div className="rounded-2xl border border-[var(--line)] bg-paper/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400">
            {labels.actions}
          </span>
          <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-500">
            7d
          </span>
        </div>

        <div className="flex items-end gap-1.5" style={{ height: barMaxH + 4 }}>
          {days.map((d, i) => {
            const active = d.count > 0;
            const h = Math.max(6, targetHeights[i] ?? 6);
            const green = Math.min(0.92, 0.28 + d.count * 0.06);
            return (
              <div
                key={d.key}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                title={`${d.label}: ${d.count}`}
              >
                <div
                  className="w-full max-w-[28px] rounded-t-lg rounded-b-sm"
                  style={{
                    height: h,
                    background: active
                      ? `linear-gradient(to top, rgba(5,150,105,${green}) 0%, rgba(52,211,153,${green}) 100%)`
                      : "rgba(244, 63, 94, 0.32)",
                    transition:
                      "height 1.8s cubic-bezier(0.16, 1, 0.3, 1), background 1.2s ease",
                  }}
                />
                <span className="text-[9px] font-medium text-zinc-500">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2 text-[9px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {labels.active}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500/60" />
            {labels.quiet}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-[var(--line)] bg-paper/40 px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {labels.open}
          </div>
          <div className="mt-0.5 font-display text-2xl font-bold text-brand transition-all duration-500">
            {openCount}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-paper/40 px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {labels.done}
          </div>
          <div className="mt-0.5 font-display text-2xl font-bold text-lime transition-all duration-500">
            {doneCount}
          </div>
        </div>
      </div>

      {lists.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-paper/40 px-3 py-2.5">
          {lists.map((l) => {
            const n = cards.filter((c) => c.listId === l.id).length;
            const active = n > 0;
            return (
              <div key={l.id} className="flex items-center gap-2">
                <span
                  className="w-14 truncate text-[11px] font-medium"
                  style={{ color: l.accent }}
                >
                  {l.title}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/35">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: active
                        ? `${Math.max(10, Math.round((n / listMax) * 100))}%`
                        : "12%",
                      background: active
                        ? l.accent
                        : "rgba(244, 63, 94, 0.4)",
                      transition:
                        "width 1.6s cubic-bezier(0.16, 1, 0.3, 1), background 1s ease",
                    }}
                  />
                </div>
                <span className="w-4 text-right text-[11px] tabular-nums text-zinc-500 transition-all duration-500">
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
