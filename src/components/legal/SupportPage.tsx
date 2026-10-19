"use client";

import { Mail, MessageCircle } from "lucide-react";
import { PublicShell } from "@/components/legal/PublicShell";
import { useT } from "@/lib/i18n/LanguageContext";
import { SUPPORT_EMAIL } from "@/lib/support";

export function SupportPage() {
  const t = useT();

  return (
    <PublicShell>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        {t("support")}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold">{t("supportCenter")}</h1>
      <p className="mt-2 text-sm text-muted">{t("supportHint")}</p>

      <div className="mt-8 space-y-4">
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Flowly%20support`}
          className="flex items-start gap-4 rounded-[28px] border border-[var(--line)] bg-surface p-6 transition hover:border-brand/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-ink">{t("supportEmail")}</div>
            <div className="mt-1 font-mono text-lg text-brand">{SUPPORT_EMAIL}</div>
            <p className="mt-2 text-sm text-zinc-400">{t("supportEmailHint")}</p>
          </div>
        </a>

        <div className="rounded-[28px] border border-[var(--line)] bg-surface p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-200">
              <p>{t("supportP1")}</p>
              <p>{t("supportP2")}</p>
              <p>{t("supportP3")}</p>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
