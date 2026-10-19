"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import type { Board, Card } from "@/lib/types";
import { PRIORITY_COLORS, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";

type Filter = "today" | "week" | "all";

type Item = {
  card: Card;
  board: Board;
  listTitle: string;
};

type Props = {
  initialFilter: Filter;
  items: Item[];
  counts: { today: number; week: number; all: number };
};

const filters: { id: Filter; label: MessageKey }[] = [
  { id: "today", label: "filterToday" },
  { id: "week", label: "filterWeek" },
  { id: "all", label: "filterAllTime" },
];

export function CompletedView({ initialFilter, items: initialItems, counts }: Props) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [items, setItems] = useState(initialItems);
  const [localCounts, setLocalCounts] = useState(counts);
  const [loading, setLoading] = useState(false);

  async function load(next: Filter) {
    setFilter(next);
    setLoading(true);
    const res = await fetch(`/api/completed?filter=${next}`);
    const data = await res.json();
    setLoading(false);
    if (data.items) setItems(data.items);
    if (data.counts) setLocalCounts(data.counts);
  }

  async function reopen(cardId: string) {
    const res = await fetch("/api/cards/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, complete: false }),
    });
    if (!res.ok) return;
    await load(filter);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = item.card.completedAt
        ? format(new Date(item.card.completedAt), "yyyy-MM-dd")
        : "unknown";
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted">{t("completedTasks")}</div>
          <h1 className="font-display text-3xl font-bold">{t("completedTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("completedHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void load(f.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                filter === f.id
                  ? "bg-brand text-black"
                  : "border border-[var(--line)] text-muted hover:text-ink",
              )}
            >
              {t(f.label)}
              <span className="ml-1.5 opacity-70">
                {localCounts[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-[var(--line)] bg-surface p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-brand" />
          <p className="mt-3 text-sm text-muted">{t("completedEmpty")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayItems]) => (
            <section key={day}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {day === "unknown"
                  ? t("filterAllTime")
                  : format(new Date(day), "EEEE, MMM d")}
              </h2>
              <div className="space-y-2">
                {dayItems.map(({ card, board, listTitle }) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-surface px-4 py-3"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ background: PRIORITY_COLORS[card.priority] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">
                        {card.title}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        <Link href={`/board/${board.id}`} className="hover:text-brand">
                          {board.name}
                        </Link>
                        {" · "}
                        {listTitle}
                        {card.completedAt && (
                          <>
                            {" · "}
                            {format(new Date(card.completedAt), "HH:mm")}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void reopen(card.id)}
                      className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
                    >
                      {t("reopen")}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
