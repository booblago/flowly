"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { Card } from "@/lib/types";
import { PRIORITY_STYLES, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";

function Section({
  titleKey,
  hintKey,
  cards,
  tone,
}: {
  titleKey: MessageKey;
  hintKey: MessageKey;
  cards: Card[];
  tone: string;
}) {
  const t = useT();
  return (
    <section className="rounded-[24px] border border-[var(--line)] bg-surface p-5">
      <div
        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone}`}
      >
        {t(titleKey)}
      </div>
      <p className="mt-2 text-sm text-muted">{t(hintKey)}</p>
      <div className="mt-4 space-y-2">
        {cards.length === 0 && (
          <p className="text-sm text-muted">{t("nothingHere")}</p>
        )}
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/board/${card.boardId}`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3"
          >
            <div>
              <div className="text-sm font-semibold">{card.title}</div>
              <div className="text-xs text-muted">
                {card.dueDate
                  ? `${t("due")} ${format(new Date(card.dueDate), "MMM d")}`
                  : t("noDueDate")}
                {card.estimateHours
                  ? ` · ${card.loggedHours}/${card.estimateHours}h`
                  : ""}
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                PRIORITY_STYLES[card.priority],
              )}
            >
              {t(card.priority)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function InboxView({
  inbox,
}: {
  inbox: {
    overdue: Card[];
    dueSoon: Card[];
    unassigned: Card[];
    highImpact: Card[];
    slaRisk: Card[];
  };
}) {
  const t = useT();
  return (
    <>
      <h1 className="font-display text-3xl font-bold">{t("smartInbox")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{t("inboxHint")}</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Section
          titleKey="overdue"
          hintKey="overdueHint"
          cards={inbox.overdue}
          tone="chip-rose"
        />
        <Section
          titleKey="dueSoon"
          hintKey="dueSoonHint"
          cards={inbox.dueSoon}
          tone="chip-amber"
        />
        <Section
          titleKey="unassigned"
          hintKey="unassignedHint"
          cards={inbox.unassigned}
          tone="chip-violet"
        />
        <Section
          titleKey="highImpact"
          hintKey="highImpactHint"
          cards={inbox.highImpact}
          tone="chip-pink"
        />
        <Section
          titleKey="slaRisk"
          hintKey="slaRiskHint"
          cards={inbox.slaRisk}
          tone="chip-lime"
        />
      </div>
    </>
  );
}
