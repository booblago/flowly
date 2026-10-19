"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { UserMenu } from "@/components/app/UserMenu";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";
import { SUPPORT_EMAIL } from "@/lib/support";

const legalLinks: { href: string; label: MessageKey }[] = [
  { href: "/legal/privacy", label: "privacyPolicy" },
  { href: "/legal/terms", label: "termsOfService" },
  { href: "/legal/security", label: "securityPolicy" },
  { href: "/legal/cookies", label: "cookiePolicy" },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <div className="mesh-bg flex min-h-screen flex-col text-ink">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-black/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-display text-xl font-extrabold">
              <span className="neon-cyan">Flow</span>
              <span className="neon-pink">ly</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavChip href="/" active={pathname === "/"}>
                {t("brand")}
              </NavChip>
              {signedIn ? (
                <>
                  <NavChip href="/dashboard" active={pathname.startsWith("/dashboard")}>
                    {t("boards")}
                  </NavChip>
                  <NavChip href="/inbox" active={pathname.startsWith("/inbox")}>
                    {t("inbox")}
                  </NavChip>
                  <NavChip href="/completed" active={pathname.startsWith("/completed")}>
                    {t("completedTasks")}
                  </NavChip>
                  <NavChip href="/analytics" active={pathname.startsWith("/analytics")}>
                    {t("analytics")}
                  </NavChip>
                </>
              ) : (
                <>
                  <NavChip href="/login" active={pathname.startsWith("/login")}>
                    {t("login")}
                  </NavChip>
                  <NavChip href="/register" active={pathname.startsWith("/register")}>
                    {t("startFree")}
                  </NavChip>
                </>
              )}
              <NavChip href="/support" active={pathname.startsWith("/support")}>
                {t("support")}
              </NavChip>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            {signedIn ? (
              <UserMenu />
            ) : (
              <Link
                href="/register"
                className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:inline-flex"
              >
                {t("startFree")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>

      <footer className="mt-auto border-t border-[var(--line)] bg-black/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="font-display text-lg font-extrabold">
              <span className="neon-cyan">Flow</span>
              <span className="neon-pink">ly</span>
            </div>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">{t("landingBadge")}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {t("product")}
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
              <Link href="/" className="hover:text-brand">
                {t("brand")}
              </Link>
              <Link href={signedIn ? "/dashboard" : "/login"} className="hover:text-brand">
                {t("boards")}
              </Link>
              <Link href={signedIn ? "/inbox" : "/register"} className="hover:text-brand">
                {signedIn ? t("inbox") : t("startFree")}
              </Link>
              <Link href={signedIn ? "/completed" : "/login"} className="hover:text-brand">
                {t("completedTasks")}
              </Link>
              <Link href={signedIn ? "/analytics" : "/login"} className="hover:text-brand">
                {t("analytics")}
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
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>© {new Date().getFullYear()} Flowly</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { legalLinks };

function NavChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand/15 text-brand"
          : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
