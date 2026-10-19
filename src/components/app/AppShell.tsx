"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Headphones,
  Inbox,
  LayoutDashboard,
  Menu,
  Rows3,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Notification } from "@/lib/types";
import { AppFooter } from "@/components/app/AppFooter";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { UserMenu } from "@/components/app/UserMenu";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";

const links: { href: string; label: MessageKey; icon: typeof Inbox }[] = [
  { href: "/dashboard", label: "boards", icon: LayoutDashboard },
  { href: "/inbox", label: "inbox", icon: Inbox },
  { href: "/completed", label: "completedTasks", icon: CheckCircle2 },
  { href: "/analytics", label: "analytics", icon: BarChart3 },
  { href: "/support", label: "support", icon: Headphones },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [compact, setCompact] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setMobileNav(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("flowly-density");
    setCompact(saved === "compact");
  }, []);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => undefined);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  async function markRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function toggleDensity() {
    const next = !compact;
    setCompact(next);
    localStorage.setItem("flowly-density", next ? "compact" : "comfy");
  }

  return (
    <div
      className={`flex min-h-screen flex-col bg-paper text-ink ${compact ? "density-compact" : ""}`}
    >
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-black/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-display text-xl font-extrabold">
              <span className="neon-cyan">Flow</span>
              <span className="neon-pink">ly</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-brand/15 text-brand"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {t(link.label)}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="relative flex items-center gap-2">
            <LanguageSwitcher compact />
            <button
              onClick={toggleDensity}
              className="hidden items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-muted hover:text-ink sm:inline-flex"
              title="Adaptive density"
            >
              <Rows3 className="h-3.5 w-3.5 text-lime" />
              {compact ? t("compact") : t("comfy")}
            </button>
            <button
              onClick={() => {
                setOpen((v) => !v);
                setMobileNav(false);
                if (!open) void markRead();
              }}
              className="relative rounded-full border border-[var(--line)] p-2 text-muted hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-paper">
                  {unread}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--line)] bg-surface p-3 shadow-xl sm:right-12">
                <div className="mb-2 text-sm font-semibold">{t("notifications")}</div>
                <div className="max-h-72 space-y-2 overflow-auto">
                  {notifications.length === 0 && (
                    <p className="text-sm text-muted">{t("caughtUp")}</p>
                  )}
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl bg-paper px-3 py-2 hover:bg-surface-2"
                    >
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted">{n.body}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <UserMenu />
            <button
              type="button"
              className="rounded-full border border-[var(--line)] p-2 text-muted hover:text-ink md:hidden"
              aria-label={mobileNav ? t("close") : "Menu"}
              aria-expanded={mobileNav}
              onClick={() => {
                setMobileNav((v) => !v);
                setOpen(false);
              }}
            >
              {mobileNav ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileNav && (
          <nav className="border-t border-[var(--line)] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "bg-brand/15 text-brand"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {t(link.label)}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
