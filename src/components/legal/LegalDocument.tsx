"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PublicShell, legalLinks } from "@/components/legal/PublicShell";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";

type Props = {
  titleKey: MessageKey;
  bodyKeys: MessageKey[];
};

export function LegalDocument({ titleKey, bodyKeys }: Props) {
  const t = useT();
  const pathname = usePathname();

  return (
    <PublicShell>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        {t("legal")}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-muted">{t("legalUpdated")}</p>
      <article className="mt-8 space-y-4 rounded-[28px] border border-[var(--line)] bg-surface p-6 text-sm leading-relaxed text-zinc-200">
        {bodyKeys.map((key) => (
          <p key={key}>{t(key)}</p>
        ))}
      </article>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {legalLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname === link.href
                ? "font-semibold text-ink"
                : "text-brand hover:underline"
            }
          >
            {t(link.label)}
          </Link>
        ))}
        <Link
          href="/support"
          className={
            pathname === "/support"
              ? "font-semibold text-ink"
              : "text-brand hover:underline"
          }
        >
          {t("support")}
        </Link>
      </div>
    </PublicShell>
  );
}
