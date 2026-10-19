"use client";

import Link from "next/link";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useState } from "react";
import type { Card, RecurrenceFreq } from "@/lib/types";
import type { PlanId } from "@/lib/plans";
import { useT } from "@/lib/i18n/LanguageContext";

export function CalendarView({
  boardId,
  boardName,
  cards: initialCards,
  plan = "free",
}: {
  boardId: string;
  boardName: string;
  cards: Card[];
  plan?: PlanId;
}) {
  const t = useT();
  const [cards, setCards] = useState(initialCards);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isPro = plan === "pro";
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const dated = cards.filter((c) => c.dueDate);
  const recurring = cards.filter((c) => c.recurrence);

  async function setRecurrence(cardId: string, recurrence: RecurrenceFreq | null) {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/cards/recurrence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, recurrence }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || t("saveFailed"));
      return;
    }
    setCards((prev) => prev.map((c) => (c.id === cardId ? data.card : c)));
  }

  async function processRecurring() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/cards/recurrence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ process: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || t("saveFailed"));
      return;
    }
    setMessage(t("recurringSpawned").replace("{n}", String(data.spawned ?? 0)));
    window.location.reload();
  }

  async function shareReport() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, action: "share" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || t("saveFailed"));
      return;
    }
    const url = `${window.location.origin}${data.shareUrl}`;
    await navigator.clipboard.writeText(url);
    setMessage(`${t("reportLinkCopied")} ${url}`);
  }

  async function exportCsv() {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/reports?boardId=${boardId}&format=csv`);
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || t("saveFailed"));
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flowly-${boardId}.csv`;
    a.click();
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={`/board/${boardId}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            {t("backToBoard")}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {boardName} · {t("calendarTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {format(today, "MMMM yyyy")} — {t("calendarHint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !isPro}
            onClick={() => void shareReport()}
            className="rounded-full border border-accent/40 px-4 py-2 text-xs font-semibold text-accent disabled:opacity-50"
          >
            {t("shareClientReport")} {!isPro && "· PRO"}
          </button>
          <button
            type="button"
            disabled={busy || !isPro}
            onClick={() => void exportCsv()}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {t("exportCsv")} {!isPro && "· PRO"}
          </button>
          <button
            type="button"
            disabled={busy || !isPro}
            onClick={() => void processRecurring()}
            className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
          >
            {t("processRecurring")} {!isPro && "· PRO"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-xl border border-[var(--line)] bg-surface px-3 py-2 text-xs text-muted">
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-surface">
        <div className="grid grid-cols-7 border-b border-[var(--line)] bg-paper text-center text-xs font-semibold uppercase tracking-wide text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = dated.filter(
              (c) => c.dueDate && isSameDay(new Date(c.dueDate), day),
            );
            return (
              <div
                key={day.toISOString()}
                className={`min-h-28 border-b border-r border-[var(--line)] p-2 ${
                  isSameMonth(day, today) ? "bg-surface" : "bg-paper/80"
                }`}
              >
                <div
                  className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isSameDay(day, today)
                      ? "bg-brand text-black"
                      : "text-muted"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {items.map((card) => (
                    <Link
                      key={card.id}
                      href={`/board/${boardId}`}
                      className="block truncate rounded-lg bg-brand/15 px-2 py-1 text-[11px] font-medium text-brand"
                    >
                      {card.recurrence ? "↻ " : ""}
                      {card.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="mt-6 rounded-[28px] border border-[var(--line)] bg-surface p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold">{t("recurringTitle")}</h2>
          {!isPro && (
            <span className="chip-pink rounded-full px-2 py-0.5 text-[10px] font-bold">
              PRO
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{t("recurringHint")}</p>
        <div className="mt-4 space-y-2">
          {cards
            .filter((c) => !c.completedAt)
            .slice(0, 12)
            .map((card) => (
              <div
                key={card.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-3 py-2"
              >
                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                  {card.title}
                </div>
                <select
                  disabled={!isPro || busy}
                  value={card.recurrence ?? ""}
                  onChange={(e) =>
                    void setRecurrence(
                      card.id,
                      (e.target.value || null) as RecurrenceFreq | null,
                    )
                  }
                  className="rounded-lg border border-[var(--line)] bg-paper px-2 py-1 text-xs disabled:opacity-50"
                >
                  <option value="">{t("noRecurrence")}</option>
                  <option value="daily">{t("recDaily")}</option>
                  <option value="weekly">{t("recWeekly")}</option>
                  <option value="monthly">{t("recMonthly")}</option>
                </select>
              </div>
            ))}
          {recurring.length === 0 && isPro && (
            <p className="text-xs text-muted">{t("noRecurringYet")}</p>
          )}
        </div>
      </section>

      <div className="mt-4 text-xs text-muted">
        {t("calendarTip")} {format(addDays(monthEnd, 0), "MMM d")}.
      </div>
    </>
  );
}
