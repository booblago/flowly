"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Check,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { Board, Card, List, Priority } from "@/lib/types";
import {
  PRIORITIES,
  PRIORITY_CODES,
  PRIORITY_COLORS,
  cn,
  daysInList,
  nextPriority,
} from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";

export function SortableList({
  list,
  cards,
  allLists,
  board,
  completingIds,
  onAddCard,
  onOpenCard,
  onSetDefaultPriority,
  onSetCardPriority,
  onRenameList,
  onToggleComplete,
  onDeleteList,
  onDeleteCard,
  onMoveCard,
}: {
  list: List;
  cards: Card[];
  allLists: List[];
  board: Board;
  completingIds: Set<string>;
  onAddCard: (listId: string, title: string) => Promise<void>;
  onOpenCard: (card: Card) => void;
  onSetDefaultPriority: (listId: string, priority: Priority) => Promise<void>;
  onSetCardPriority: (cardId: string, priority: Priority) => Promise<void>;
  onRenameList: (listId: string, title: string) => Promise<void>;
  onToggleComplete: (card: Card) => void;
  onDeleteList: () => void;
  onDeleteCard: (card: Card) => void;
  onMoveCard: (cardId: string, listId: string) => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id, data: { type: "list" } });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${list.id}`,
    data: { type: "list-drop", listId: list.id },
  });
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const atLimit = list.wipLimit != null && cards.length >= list.wipLimit;

  useEffect(() => {
    if (!editing) setEditTitle(list.title);
  }, [list.title, editing]);

  async function commitRename() {
    const next = editTitle.trim();
    setEditing(false);
    if (!next || next === list.title) {
      setEditTitle(list.title);
      return;
    }
    await onRenameList(list.id, next);
  }

  async function submitCard() {
    if (!title.trim() || atLimit) return;
    await onAddCard(list.id, title.trim());
    setTitle("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.25 : 1,
        borderTopColor: list.accent,
      }}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl border border-t-2 bg-surface/70 p-2.5 backdrop-blur-md",
        isOver ? "border-brand/50" : "border-[var(--line)]",
        isDragging && "pointer-events-none",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2 px-1">
        {editing ? (
          <input
            value={editTitle}
            autoFocus
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitRename();
              }
              if (e.key === "Escape") {
                setEditTitle(list.title);
                setEditing(false);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-md border border-white/20 bg-black px-1.5 py-0.5 text-sm font-semibold outline-none ring-brand focus:ring-1"
            style={{ color: list.accent }}
          />
        ) : (
          <div
            className="flex min-w-0 flex-1 cursor-grab items-center active:cursor-grabbing"
            title={t("dragListHint")}
            {...attributes}
            {...listeners}
          >
            <div
              className="min-w-0 truncate text-sm font-semibold"
              style={{ color: list.accent }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditTitle(list.title);
                setEditing(true);
              }}
            >
              {list.title}
              <span className="ml-2 font-normal text-muted">{cards.length}</span>
              {list.wipLimit != null && (
                <span
                  className={cn(
                    "ml-1 text-xs font-normal",
                    atLimit ? "text-rose" : "text-muted",
                  )}
                >
                  / {list.wipLimit}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setEditTitle(list.title);
              setEditing(true);
            }}
            title={t("renameList")}
            aria-label={t("renameList")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <PriorityCodeButton
            priority={list.defaultPriority ?? "medium"}
            title={t("defaultPriorityHint")}
            onSelect={(priority) => {
              void onSetDefaultPriority(list.id, priority);
            }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDeleteList}
            title={t("deleteList")}
            aria-label={t("deleteList")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-rose/15 hover:text-rose"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
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
        <div ref={setDropRef} className="list-gap min-h-[48px] flex-1 space-y-2">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              board={board}
              pendingComplete={completingIds.has(card.id)}
              onOpen={() => onOpenCard(card)}
              onToggleComplete={() => onToggleComplete(card)}
              onSetPriority={(priority) =>
                void onSetCardPriority(card.id, priority)
              }
              onDelete={() => onDeleteCard(card)}
            />
          ))}
        </div>
      </SortableContext>
      <div className="mt-2">
        {adding ? (
          <div className="space-y-2">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("addCard")}
              autoFocus
              rows={2}
              className="w-full resize-none rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none ring-brand focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitCard();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void submitCard()}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black"
              >
                {t("addCard")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                }}
                className="text-sm text-zinc-500 hover:text-white"
              >
                {t("close")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={atLimit}
            onClick={() => setAdding(true)}
            className="relative z-10 inline-flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {atLimit ? t("wipFull") : t("addCard")}
          </button>
        )}
      </div>
    </div>
  );
}

function PriorityCodeButton({
  priority,
  title,
  onSelect,
  className,
}: {
  priority: Priority;
  title: string;
  onSelect: (priority: Priority) => void;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={title}
        aria-label={title}
        aria-expanded={open}
        className="text-[9px] font-medium uppercase tracking-wide opacity-70 transition hover:opacity-100"
        style={{ color: PRIORITY_COLORS[priority] }}
      >
        {PRIORITY_CODES[priority]}
      </button>
      {open && (
        <div
          role="listbox"
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-0 z-30 mt-1 min-w-[4.5rem] rounded-lg border border-[var(--line)] bg-[#141416] py-1 shadow-xl"
        >
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              role="option"
              aria-selected={p === priority}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(p);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-2.5 py-1 text-left text-[9px] font-medium uppercase tracking-wide transition hover:bg-white/5",
                p === priority ? "opacity-100" : "opacity-60 hover:opacity-100",
              )}
              style={{ color: PRIORITY_COLORS[p] }}
              title={t(p)}
            >
              {PRIORITY_CODES[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableCard({
  card,
  board,
  pendingComplete,
  onOpen,
  onToggleComplete,
  onSetPriority,
  onDelete,
}: {
  card: Card;
  board: Board;
  pendingComplete: boolean;
  onOpen: () => void;
  onToggleComplete: () => void;
  onSetPriority: (priority: Priority) => void;
  onDelete: () => void;
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
  const showExtraMeta = Boolean(card.dueDate) || total > 0 || slaRisk;
  // pendingComplete only while marking done — never force-checked on reopen
  const checked = Boolean(card.completedAt);
  const busy = pendingComplete;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.2 : 1,
      }}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[#111113] py-2.5 pl-2 pr-2 text-left shadow-sm",
        slaRisk && "border-rose/40",
        busy && "border-brand/40 bg-brand/5",
        card.completedAt && !isDragging && "opacity-80",
        isDragging && "pointer-events-none",
      )}
    >
      <span
        className="absolute inset-y-2 left-0 w-[3px] rounded-full"
        style={{ background: PRIORITY_COLORS[card.priority] }}
        aria-hidden
      />

      <div className="flex items-start gap-1.5 pl-1.5">
        <button
          type="button"
          aria-label={checked ? t("markIncomplete") : t("markComplete")}
          title={checked ? t("markIncomplete") : t("markComplete")}
          disabled={busy}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleComplete();
          }}
          className={cn(
            "relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
            checked
              ? "border-brand bg-brand text-black"
              : "border-zinc-400 bg-transparent text-transparent hover:border-white hover:text-white/40",
            busy && "opacity-60",
          )}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </button>

        <div
          className="min-w-0 flex-1 cursor-grab touch-none text-left active:cursor-grabbing"
          title={`${t("priority")}: ${t(card.priority)}`}
          onDoubleClick={onOpen}
          {...attributes}
          {...listeners}
        >
          {labels.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
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
              "text-sm font-semibold leading-snug text-white",
              checked && "text-muted line-through decoration-zinc-500",
            )}
          >
            {card.title}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSetPriority(nextPriority(card.priority));
                }}
                title={`${t("priority")}: ${t(card.priority)}`}
                aria-label={`${t("priority")}: ${t(card.priority)}`}
                className="text-[9px] font-medium uppercase tracking-wide opacity-70 transition hover:opacity-100"
                style={{ color: PRIORITY_COLORS[card.priority] }}
              >
                {PRIORITY_CODES[card.priority]}
              </button>
              {showExtraMeta && card.dueDate && (
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
              {showExtraMeta && total > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckSquare className="h-3 w-3 shrink-0 opacity-70" />
                  {done}/{total}
                </span>
              )}
              {showExtraMeta && slaRisk && (
                <span className="font-medium text-rose">SLA {age}d</span>
              )}
            </div>
        </div>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-white/5 hover:text-white"
        >
          ···
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={t("deleteCard")}
          aria-label={t("deleteCard")}
          className="relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose/15 hover:text-rose"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
