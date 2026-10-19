"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
  Check,
  CheckSquare,
  Plus,
  Search,
  Workflow,
} from "lucide-react";
import { format } from "date-fns";
import type { Activity, Board, Card, List, PublicUser } from "@/lib/types";
import {
  PRIORITY_COLORS,
  cn,
  daysInList,
  initials,
  uid,
  userImageSrc,
} from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";
import { CardModal } from "./CardModal";

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
    if (bundle.activities) setActivities(bundle.activities);
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

  function scheduleComplete(cardId: string) {
    if (completeTimers.current.has(cardId)) return;
    setCompletingIds((prev) => new Set(prev).add(cardId));
    setToast("completePending");
    const timer = setTimeout(() => {
      completeTimers.current.delete(cardId);
      void (async () => {
        const res = await fetch("/api/cards/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, complete: true }),
        });
        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        if (!res.ok) {
          const data = await res.json();
          flash(data.error || t("completeFailed"));
          return;
        }
        await refreshBoard();
        flash(t("completeDone"));
      })();
    }, 5000);
    completeTimers.current.set(cardId, timer);
  }

  async function toggleComplete(card: Card) {
    if (completingIds.has(card.id)) {
      cancelPendingComplete(card.id);
      setToast("");
      return;
    }
    if (card.completedAt) {
      const res = await fetch("/api/cards/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, complete: false }),
      });
      if (!res.ok) {
        const data = await res.json();
        flash(data.error || t("completeFailed"));
        return;
      }
      await refreshBoard();
      return;
    }
    scheduleComplete(card.id);
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
    const bundle = await fetch(`/api/boards/${board.id}`).then((r) => r.json());
    if (bundle.cards) setCards(bundle.cards);
    if (bundle.activities) setActivities(bundle.activities);
  }

  function onDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCardItem = cards.find((c) => c.id === activeId);
    if (!activeCardItem) return;

    const overList =
      lists.find((l) => l.id === overId) ||
      lists.find((l) => l.id === cards.find((c) => c.id === overId)?.listId);
    if (!overList) return;
    if (activeCardItem.listId === overList.id) return;

    setCards((prev) => {
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
      const nextOver = [...overCards];
      nextOver.splice(insertAt, 0, moved);
      nextOver.forEach((c, i) => {
        c.position = i;
      });
      const others = without.filter((c) => c.listId !== overList.id);
      return [...others, ...nextOver];
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (lists.some((l) => l.id === activeId)) {
      if (lists.some((l) => l.id === overId)) {
        const oldIndex = lists.findIndex((l) => l.id === activeId);
        const newIndex = lists.findIndex((l) => l.id === overId);
        if (oldIndex !== newIndex) {
          const next = arrayMove(lists, oldIndex, newIndex).map((l, i) => ({
            ...l,
            position: i,
          }));
          setLists(next);
          await fetch("/api/lists", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              boardId: board.id,
              orderedIds: next.map((l) => l.id),
            }),
          });
        }
      }
      return;
    }

    const card = cards.find((c) => c.id === activeId);
    if (!card) return;
    const overList =
      lists.find((l) => l.id === overId) ||
      lists.find((l) => l.id === cards.find((c) => c.id === overId)?.listId);
    if (!overList) return;

    const listCards = cards
      .filter((c) => c.listId === overList.id)
      .sort((a, b) => a.position - b.position);
    const oldIndex = listCards.findIndex((c) => c.id === activeId);
    let newIndex = listCards.findIndex((c) => c.id === overId);
    if (newIndex < 0) newIndex = listCards.length - 1;
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
      await persistMove(activeId, overList.id, newIndex);
    } else {
      await persistMove(activeId, overList.id, Math.max(newIndex, 0));
    }
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
    if (!newListTitle.trim()) return;
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: board.id, title: newListTitle.trim() }),
    });
    const data = await res.json();
    if (data.list) {
      setLists((prev) => [...prev, data.list]);
      setNewListTitle("");
    }
  }

  async function saveCard(next: Card) {
    setCards((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    setSelected(next);
    await fetch(`/api/cards/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function setWip(listId: string, wipLimit: number | null) {
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wipLimit }),
    });
    const data = await res.json();
    if (data.list) {
      setLists((prev) => prev.map((l) => (l.id === listId ? data.list : l)));
    }
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
              <div className="scrollbar-thin flex items-start gap-3 overflow-x-auto pb-2">
                {lists.map((list) => (
                  <SortableList
                    key={list.id}
                    list={list}
                    cards={cardsInList(list.id)}
                    board={board}
                    completingIds={completingIds}
                    onAddCard={addCard}
                    onOpenCard={setSelected}
                    onSetWip={setWip}
                    onToggleComplete={toggleComplete}
                  />
                ))}
                <div className="w-72 shrink-0 rounded-2xl border border-[var(--line)] bg-surface/60 p-3">
                  <input
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder={t("newListTitle")}
                    className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addList();
                    }}
                  />
                  <button
                    onClick={() => void addList()}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand"
                  >
                    <Plus className="h-4 w-4" /> {t("addList")}
                  </button>
                </div>
              </div>
            </SortableContext>
            <DragOverlay>
              {activeCard ? (
                <div className="w-64 rounded-2xl border border-brand/40 bg-surface p-3 shadow-2xl">
                  <div className="text-sm font-semibold">{activeCard.title}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <aside className="rounded-[28px] border border-[var(--line)] bg-surface p-4">
          <h2 className="font-display text-lg font-bold">{t("activity")}</h2>
          <div className="mt-3 space-y-3">
            {activities.slice(0, 12).map((a) => {
              const user = members.find((m) => m.id === a.userId);
              const isAuto = a.message.includes("automation");
              return (
                <div key={a.id} className="text-sm">
                  <span className={isAuto ? "text-accent" : "font-semibold"}>
                    {isAuto ? "⚡" : user?.name || t("someone")}
                  </span>{" "}
                  <span className="text-muted">{a.message}</span>
                  <div className="text-[11px] text-muted">
                    {format(new Date(a.createdAt), "MMM d · HH:mm")}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {selected && (
        <CardModal
          card={selected}
          board={board}
          members={members}
          onClose={() => setSelected(null)}
          onSave={saveCard}
        />
      )}
    </div>
  );
}

function SortableList({
  list,
  cards,
  board,
  completingIds,
  onAddCard,
  onOpenCard,
  onSetWip,
  onToggleComplete,
}: {
  list: List;
  cards: Card[];
  board: Board;
  completingIds: Set<string>;
  onAddCard: (listId: string, title: string) => Promise<void>;
  onOpenCard: (card: Card) => void;
  onSetWip: (listId: string, wip: number | null) => Promise<void>;
  onToggleComplete: (card: Card) => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id, data: { type: "list" } });
  const [title, setTitle] = useState("");
  const atLimit = list.wipLimit != null && cards.length >= list.wipLimit;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderTopColor: list.accent,
      }}
      className="w-72 shrink-0 rounded-2xl border border-[var(--line)] border-t-2 bg-surface/70 p-2.5 backdrop-blur-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2 px-1">
        <div
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="text-sm font-semibold" style={{ color: list.accent }}>
            {list.title}
            <span className="ml-2 text-muted">{cards.length}</span>
            {list.wipLimit != null && (
              <span className={cn("ml-1 text-xs", atLimit ? "text-rose" : "text-muted")}>
                / {list.wipLimit}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            const raw = window.prompt(
              t("wipPrompt"),
              list.wipLimit?.toString() ?? "",
            );
            if (raw === null) return;
            const n = raw.trim() === "" ? null : Number(raw);
            void onSetWip(list.id, Number.isFinite(n as number) ? (n as number) : null);
          }}
          className="text-[10px] font-semibold uppercase text-muted hover:text-amber"
        >
          WIP
        </button>
      </div>
      {atLimit && (
        <div className="mb-2 rounded-lg bg-rose/10 px-2 py-1 text-[11px] font-medium text-rose">
          {t("wipLimitReached")}
        </div>
      )}
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="list-gap space-y-2">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              board={board}
              pendingComplete={completingIds.has(card.id)}
              onOpen={() => onOpenCard(card)}
              onToggleComplete={() => onToggleComplete(card)}
            />
          ))}
        </div>
      </SortableContext>
      <div className="mt-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={atLimit ? t("wipFull") : t("addCard")}
          disabled={atLimit}
          className="card-pad w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none disabled:opacity-40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              void onAddCard(list.id, title.trim());
              setTitle("");
            }
          }}
        />
      </div>
    </div>
  );
}

function SortableCard({
  card,
  board,
  pendingComplete,
  onOpen,
  onToggleComplete,
}: {
  card: Card;
  board: Board;
  pendingComplete: boolean;
  onOpen: () => void;
  onToggleComplete: () => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });
  const done = card.checklist.filter((i) => i.done).length;
  const total = card.checklist.length;
  const labels = board.labels.filter((l) => card.labelIds.includes(l.id));
  const age = daysInList(card.enteredListAt);
  const slaRisk = age >= board.slaDays && !card.completedAt && !pendingComplete;
  const dueSoon =
    card.dueDate &&
    new Date(card.dueDate).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000 &&
    new Date(card.dueDate).getTime() >= Date.now();
  const overdue =
    card.dueDate && new Date(card.dueDate).getTime() < Date.now();
  const showMeta = Boolean(card.dueDate) || total > 0 || slaRisk;
  const checked = Boolean(card.completedAt) || pendingComplete;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "card-lift card-pad group relative w-full overflow-hidden rounded-xl border border-[var(--line)] bg-paper py-3 pl-3.5 pr-3 text-left",
        slaRisk && "border-rose/40",
        pendingComplete && "border-brand/40 bg-brand/5",
        card.completedAt && "opacity-80",
      )}
    >
      <span
        className="absolute inset-y-2 left-0 w-[3px] rounded-full"
        style={{ background: PRIORITY_COLORS[card.priority] }}
        aria-hidden
      />

      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={checked ? t("markIncomplete") : t("markComplete")}
          title={checked ? t("markIncomplete") : t("markComplete")}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
            checked
              ? "border-brand bg-brand text-black"
              : "border-zinc-500 text-transparent hover:border-brand hover:text-brand/40",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpen}
          title={`${t("priority")}: ${t(card.priority)}`}
          {...attributes}
          {...listeners}
        >
          {labels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {labels.slice(0, 4).map((l) => (
                <span
                  key={l.id}
                  className="h-1 w-7 rounded-full"
                  style={{ background: l.color }}
                  title={l.name}
                />
              ))}
            </div>
          )}

          <div
            className={cn(
              "text-sm font-semibold leading-snug text-ink",
              checked && "text-muted line-through decoration-zinc-500",
            )}
          >
            {card.title}
          </div>

          {pendingComplete && (
            <div className="mt-1.5 text-[11px] font-medium text-brand">
              {t("movingToDone")}
            </div>
          )}

          {showMeta && !pendingComplete && (
            <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted">
              {card.dueDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    overdue && !checked && "font-medium text-rose",
                    dueSoon && !overdue && !checked && "font-medium text-amber",
                  )}
                >
                  <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                  {format(new Date(card.dueDate), "MMM d")}
                </span>
              )}
              {total > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckSquare className="h-3 w-3 shrink-0 opacity-70" />
                  <span
                    className="h-1 w-10 overflow-hidden rounded-full bg-white/10"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${Math.round((done / total) * 100)}%` }}
                    />
                  </span>
                  <span className="tabular-nums">
                    {done}/{total}
                  </span>
                </span>
              )}
              {slaRisk && (
                <span className="ml-auto font-medium text-rose" title={t("slaBreach")}>
                  {age}d
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
