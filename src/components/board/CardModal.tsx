"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Board, Card, ChecklistItem, List, Priority, PublicUser } from "@/lib/types";
import {
  PRIORITIES,
  PRIORITY_CODES,
  PRIORITY_COLORS,
  cn,
  daysInList,
  initials,
  uid,
} from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";

type Props = {
  card: Card;
  board: Board;
  members: PublicUser[];
  lists?: List[];
  onClose: () => void;
  onSave: (card: Card) => Promise<void>;
  onDelete?: () => void;
  onMove?: (listId: string) => void;
};

export function CardModal({
  card,
  board,
  members,
  lists = [],
  onClose,
  onSave,
  onDelete,
  onMove,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState(card);
  const [comment, setComment] = useState("");
  const [checkText, setCheckText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(next: Card = draft) {
    setSaving(true);
    await onSave(next);
    setDraft(next);
    setSaving(false);
  }

  function toggleLabel(labelId: string) {
    const labelIds = draft.labelIds.includes(labelId)
      ? draft.labelIds.filter((id) => id !== labelId)
      : [...draft.labelIds, labelId];
    const next = { ...draft, labelIds };
    setDraft(next);
    void save(next);
  }

  function toggleAssignee(userId: string) {
    const assigneeIds = draft.assigneeIds.includes(userId)
      ? draft.assigneeIds.filter((id) => id !== userId)
      : [...draft.assigneeIds, userId];
    const next = { ...draft, assigneeIds };
    setDraft(next);
    void save(next);
  }

  function toggleCheck(item: ChecklistItem) {
    const checklist = draft.checklist.map((c) =>
      c.id === item.id ? { ...c, done: !c.done } : c,
    );
    const next = { ...draft, checklist };
    setDraft(next);
    void save(next);
  }

  function addChecklist() {
    if (!checkText.trim()) return;
    const checklist = [
      ...draft.checklist,
      { id: uid("chk"), text: checkText.trim(), done: false },
    ];
    const next = { ...draft, checklist };
    setDraft(next);
    setCheckText("");
    void save(next);
  }

  function addComment() {
    if (!comment.trim()) return;
    const comments = [
      ...draft.comments,
      {
        id: uid("cmt"),
        userId: members[0]?.id || "usr_demo",
        text: comment.trim(),
        createdAt: new Date().toISOString(),
      },
    ];
    const next = { ...draft, comments };
    setDraft(next);
    setComment("");
    void save(next);
  }

  const done = draft.checklist.filter((i) => i.done).length;
  const total = draft.checklist.length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const age = daysInList(draft.enteredListAt);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-[28px] border border-[var(--line)] bg-surface shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--line)] p-5">
          <div className="flex-1 pr-4">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={() => void save()}
              className="w-full bg-transparent font-display text-2xl font-bold outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              {board.name} · {age}
              {t("daysInList")}
              {age >= board.slaDays ? ` · ${t("slaBreach")}` : ""}
              {saving ? ` · ${t("saving")}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-rose/30 px-3 py-1.5 text-xs font-semibold text-rose hover:bg-rose/10"
              >
                {t("deleteCard")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted hover:bg-paper"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-5">
            <label className="block text-sm font-semibold">
              {t("description")}
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                onBlur={() => void save()}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              />
            </label>

            <div>
              <div className="mb-2 text-sm font-semibold">{t("customFields")}</div>
              <div className="space-y-2">
                {board.customFields.map((field) => (
                  <label key={field.id} className="block text-xs text-muted">
                    <span style={{ color: field.color }}>{field.name}</span>
                    {field.type === "select" ? (
                      <select
                        value={String(draft.customFieldValues[field.id] ?? "")}
                        onChange={(e) => {
                          const next = {
                            ...draft,
                            customFieldValues: {
                              ...draft.customFieldValues,
                              [field.id]: e.target.value,
                            },
                          };
                          setDraft(next);
                          void save(next);
                        }}
                        className="mt-1 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm text-ink"
                      >
                        <option value="">—</option>
                        {(field.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={String(draft.customFieldValues[field.id] ?? "")}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            customFieldValues: {
                              ...draft.customFieldValues,
                              [field.id]:
                                field.type === "number"
                                  ? Number(e.target.value) || 0
                                  : e.target.value,
                            },
                          })
                        }
                        onBlur={() => void save()}
                        type={field.type === "number" ? "number" : "text"}
                        className="mt-1 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm text-ink"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>{t("checklist")}</span>
                <span className="text-xs font-medium text-muted">{progress}%</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="space-y-2">
                {draft.checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleCheck(item)}
                    />
                    <span className={item.done ? "text-muted line-through" : ""}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={checkText}
                  onChange={(e) => setCheckText(e.target.value)}
                  placeholder={t("addChecklistItem")}
                  className="flex-1 rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addChecklist();
                  }}
                />
                <button
                  onClick={addChecklist}
                  className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-black"
                >
                  {t("add")}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">{t("comments")}</div>
              <div className="space-y-2">
                {draft.comments.map((c) => {
                  const user = members.find((m) => m.id === c.userId);
                  return (
                    <div key={c.id} className="rounded-2xl bg-paper px-3 py-2 text-sm">
                      <div className="font-semibold">{user?.name || "Member"}</div>
                      <div className="text-muted">{c.text}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("writeComment")}
                  className="flex-1 rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addComment();
                  }}
                />
                <button
                  onClick={addComment}
                  className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black"
                >
                  {t("post")}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <Field label={t("priority")}>
              <div className="flex flex-wrap items-center gap-2">
                {PRIORITIES.map((p) => {
                  const active = draft.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      title={t(p)}
                      aria-label={t(p)}
                      aria-pressed={active}
                      onClick={() => {
                        const next = { ...draft, priority: p };
                        setDraft(next);
                        void save(next);
                      }}
                      className={cn(
                        "rounded-lg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition",
                        active
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-80",
                      )}
                      style={{ color: PRIORITY_COLORS[p] }}
                    >
                      {PRIORITY_CODES[p]}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={t("dueDate")}>
              <input
                type="date"
                value={draft.dueDate ? draft.dueDate.slice(0, 10) : ""}
                onChange={(e) => {
                  const next = {
                    ...draft,
                    dueDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  };
                  setDraft(next);
                  void save(next);
                }}
                className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm"
              />
            </Field>

            <Field label={t("estimateHours")}>
              <input
                type="number"
                min={0}
                value={draft.estimateHours}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    estimateHours: Number(e.target.value) || 0,
                  })
                }
                onBlur={() => void save()}
                className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm"
              />
            </Field>

            <Field label={t("loggedHours")}>
              <input
                type="number"
                min={0}
                value={draft.loggedHours}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    loggedHours: Number(e.target.value) || 0,
                  })
                }
                onBlur={() => void save()}
                className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm"
              />
            </Field>

            <Field label={t("labels")}>
              <div className="flex flex-wrap gap-2">
                {board.labels.map((label) => {
                  const active = draft.labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold text-black",
                        !active && "opacity-35",
                      )}
                      style={{ background: label.color }}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={t("assignees")}>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = draft.assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium",
                        active
                          ? "border-brand/40 bg-brand/10 text-brand"
                          : "border-[var(--line)] text-muted",
                      )}
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] text-black"
                        style={{ background: m.avatarColor }}
                      >
                        {initials(m.name)}
                      </span>
                      {m.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </Field>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
