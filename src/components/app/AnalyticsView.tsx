"use client";

import { useT } from "@/lib/i18n/LanguageContext";
import type { PlanId } from "@/lib/plans";

type WorkloadRow = {
  userId: string;
  name: string;
  cards: number;
  loggedHours: number;
  estimateHours: number;
};

type Analytics = {
  totalCards: number;
  done: number;
  overdue: number;
  byPriority: Record<string, number>;
  loggedHours: number;
  estimateHours: number;
  boards: number;
  completionRate: number;
  slaBreaches: number;
  slaBreachesThisWeek?: number;
  automationRuns: number;
  activeRules: number;
  plan?: PlanId;
  workload?: WorkloadRow[];
};

export function AnalyticsView({ analytics }: { analytics: Analytics }) {
  const t = useT();
  const isPro = analytics.plan === "pro";

  const stats = [
    { label: t("boards"), value: analytics.boards, tone: "text-brand" },
    { label: t("totalCards"), value: analytics.totalCards, tone: "text-violet" },
    { label: t("done"), value: analytics.done, tone: "text-lime" },
    { label: t("overdue"), value: analytics.overdue, tone: "text-rose" },
    {
      label: t("completion"),
      value: `${analytics.completionRate}%`,
      tone: "text-accent",
    },
    {
      label: t("hoursLogged"),
      value: `${analytics.loggedHours} / ${analytics.estimateHours}`,
      tone: "text-amber",
    },
    { label: t("slaBreaches"), value: analytics.slaBreaches, tone: "text-rose" },
    {
      label: t("slaBreachesWeek"),
      value: analytics.slaBreachesThisWeek ?? 0,
      tone: "text-rose",
    },
    { label: t("activeRules"), value: analytics.activeRules, tone: "text-brand" },
    {
      label: t("automationRuns"),
      value: analytics.automationRuns,
      tone: "text-accent",
    },
  ];

  const priorities = Object.entries(analytics.byPriority);
  const max = Math.max(...priorities.map(([, n]) => n), 1);
  const colors = ["#22d3ee", "#a78bfa", "#fbbf24", "#fb7185"];
  const workload = analytics.workload ?? [];
  const maxLoad = Math.max(
    ...workload.map((w) => Math.max(w.loggedHours, w.estimateHours)),
    1,
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {t("deliveryAnalytics")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("analyticsHint")}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            isPro ? "chip-pink" : "chip-violet"
          }`}
        >
          {isPro ? "PRO" : "FREE"}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[24px] border border-[var(--line)] bg-surface p-5"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              {stat.label}
            </div>
            <div className={`mt-2 font-display text-3xl font-bold ${stat.tone}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-[28px] border border-[var(--line)] bg-surface p-6">
        <h2 className="font-display text-xl font-bold">{t("priorityMix")}</h2>
        <div className="mt-5 space-y-3">
          {priorities.map(([name, count], i) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium capitalize">
                  {["low", "medium", "high", "urgent"].includes(name)
                    ? t(name as "low" | "medium" | "high" | "urgent")
                    : name}
                </span>
                <span className="text-muted">{count}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    background: colors[i % colors.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[var(--line)] bg-surface p-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold">{t("workloadTitle")}</h2>
          {!isPro && (
            <span className="chip-pink rounded-full px-2 py-0.5 text-[10px] font-bold">
              PRO
            </span>
          )}
        </div>
        {!isPro ? (
          <p className="mt-3 text-sm text-muted">{t("workloadProHint")}</p>
        ) : workload.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("noWorkload")}</p>
        ) : (
          <div className="mt-5 space-y-4">
            {workload.map((row) => (
              <div key={row.userId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">
                    {row.name} · {row.cards} {t("cardsWord")}
                  </span>
                  <span className="text-muted">
                    {row.loggedHours}h / {row.estimateHours}h
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{
                      width: `${(row.loggedHours / maxLoad) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
