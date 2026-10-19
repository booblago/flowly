"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";
import { SUPPORT_EMAIL } from "@/lib/support";

const legalLinks: { href: string; label: MessageKey }[] = [
  { href: "/legal/privacy", label: "privacyPolicy" },
  { href: "/legal/terms", label: "termsOfService" },
  { href: "/legal/security", label: "securityPolicy" },
  { href: "/legal/cookies", label: "cookiePolicy" },
];

export function AppFooter() {
  const t = useT();

  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-black/80">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="font-display text-lg font-extrabold">
            <span className="neon-cyan">Flow</span>
            <span className="neon-pink">ly</span>
          </Link>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">{t("landingBadge")}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("product")}
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
            <Link href="/dashboard" className="hover:text-brand">
              {t("boards")}
            </Link>
            <Link href="/inbox" className="hover:text-brand">
              {t("inbox")}
            </Link>
            <Link href="/completed" className="hover:text-brand">
              {t("completedTasks")}
            </Link>
            <Link href="/analytics" className="hover:text-brand">
              {t("analytics")}
            </Link>
            <Link href="/account" className="hover:text-brand">
              {t("account")}
            </Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("support")}
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
            <Link href="/support" className="hover:text-brand">
              {t("supportCenter")}
            </Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("legal")}
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-brand">
                {t(link.label)}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Flowly</span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
