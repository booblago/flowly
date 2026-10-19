"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Gauge,
  Inbox,
  LayoutDashboard,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { DemoBoardButton } from "@/components/app/DemoBoardButton";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { UserMenu } from "@/components/app/UserMenu";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";

export function LandingPage() {
  const t = useT();
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);

  const features: {
    icon: typeof Workflow;
    title: MessageKey;
    text: MessageKey;
    chip: string;
  }[] = [
    {
      icon: Workflow,
      title: "featAutomation",
      text: "featAutomationText",
      chip: "chip-cyan",
    },
    {
      icon: Gauge,
      title: "featWip",
      text: "featWipText",
      chip: "chip-amber",
    },
    {
      icon: Inbox,
      title: "featInbox",
      text: "featInboxText",
      chip: "chip-pink",
    },
    {
      icon: Zap,
      title: "featTemplates",
      text: "featTemplatesText",
      chip: "chip-lime",
    },
    {
      icon: CalendarDays,
      title: "featCalendar",
      text: "featCalendarText",
      chip: "chip-violet",
    },
    {
      icon: BarChart3,
      title: "featAnalytics",
      text: "featAnalyticsText",
      chip: "chip-rose",
    },
  ];

  const reasons: { title: MessageKey; text: MessageKey }[] = [
    { title: "why1Title", text: "why1Text" },
    { title: "why2Title", text: "why2Text" },
    { title: "why3Title", text: "why3Text" },
    { title: "why4Title", text: "why4Text" },
  ];

  const steps: { title: MessageKey; text: MessageKey }[] = [
    { title: "how1Title", text: "how1Text" },
    { title: "how2Title", text: "how2Text" },
    { title: "how3Title", text: "how3Text" },
  ];

  const audiences: { title: MessageKey; text: MessageKey; tone: string }[] = [
    { title: "audience1Title", text: "audience1Text", tone: "text-brand" },
    { title: "audience2Title", text: "audience2Text", tone: "text-accent" },
    { title: "audience3Title", text: "audience3Text", tone: "text-lime" },
  ];

  const compares: MessageKey[] = [
    "compare1",
    "compare2",
    "compare3",
    "compare4",
    "compare5",
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="landing-aurora" />
        <div className="landing-grid absolute inset-0 opacity-50" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-pink-400/25 to-transparent" />
      </div>

      <header className="relative z-50 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-display text-2xl font-extrabold tracking-tight"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="neon-cyan">Flow</span>
          <span className="neon-pink">ly</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <LanguageSwitcher />
          {status === "loading" ? (
            <span className="px-3 py-1.5 text-xs text-muted">…</span>
          ) : signedIn ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-brand transition hover:border-cyan-400/50 hover:bg-cyan-400/15"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {t("boards")}
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 text-muted transition hover:bg-white/5 hover:text-ink"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-zinc-200"
              >
                {t("startFree")}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10">
        <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 inline-flex cursor-default items-center gap-2 rounded-full border border-cyan-400/25 bg-surface/80 px-3 py-1.5 text-sm font-semibold text-brand shadow-[0_0_24px_rgba(34,211,238,0.12)]"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              {t("landingBadge")}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="font-display cursor-default text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl"
            >
              <span className="neon-cyan">Flowly</span>
            </motion.h1>

            <div className="mt-3 flex gap-2">
              <span className="h-1 w-10 rounded-full bg-brand" />
              <span className="h-1 w-6 rounded-full bg-accent" />
              <span className="h-1 w-4 rounded-full bg-lime" />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="hero-lead mt-6 max-w-xl cursor-default text-lg leading-relaxed"
            >
              {t("landingLead")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              {signedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="cta-boards inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-black"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {t("openMyBoards")}
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </Link>
                  <Link
                    href="/inbox"
                    className="cta-secondary inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-surface/80 px-6 py-3 text-sm font-semibold text-ink"
                  >
                    <Inbox className="h-4 w-4 text-accent" />
                    {t("inbox")}
                  </Link>
                </>
              ) : (
                <>
                  <DemoBoardButton variant="primary" labelKey="openDemo" />
                  <Link
                    href="/register"
                    className="cta-secondary rounded-full border border-[var(--line)] bg-surface/80 px-6 py-3 text-sm font-semibold text-ink"
                  >
                    {t("createAccount")}
                  </Link>
                </>
              )}
            </motion.div>
            <p className="mt-4 text-xs text-muted">
              {signedIn ? t("signedInHint") : t("demoBoardHint")}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="relative"
          >
            <div
              className="pointer-events-none absolute -inset-4 rounded-[36px] bg-gradient-to-br from-cyan-400/18 via-transparent to-pink-400/16 blur-2xl float-soft"
              aria-hidden
            />
            <div className="board-canvas board-stage relative overflow-hidden rounded-[28px] p-5">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-lime/80" />
              </div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {t("liveBoard")}
                  </div>
                  <div className="font-display text-xl font-bold text-white">
                    Product Launch
                  </div>
                </div>
                <span className="chip-lime rounded-full px-3 py-1 text-[11px] font-bold tracking-wide">
                  4 {t("rulesActive")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { col: "Ready", accent: "#22d3ee", a: "Calendar view", b: "WIP 2/6" },
                  { col: "In Progress", accent: "#fbbf24", a: "Drag polish", b: "SLA 3d" },
                  { col: "QA", accent: "#f472b6", a: "Contrast fix", b: "Auto↑ high" },
                ].map((item, i) => (
                  <motion.div
                    key={item.col}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.3 + i * 0.08,
                      duration: 0.35,
                      ease: "easeOut",
                    }}
                    className="preview-col rounded-2xl border border-[var(--line)] bg-surface/80 p-2.5"
                  >
                    <div
                      className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold"
                      style={{ color: item.accent }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: item.accent }}
                      />
                      {item.col}
                    </div>
                    <div className="rounded-xl border border-[var(--line)] bg-paper p-3">
                      <div
                        className="h-1.5 w-10 rounded-full"
                        style={{ background: item.accent }}
                      />
                      <div className="mt-2 text-xs font-semibold text-white">{item.a}</div>
                      <div className="mt-1 text-[10px] font-medium text-zinc-300">{item.b}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="relative border-t border-[var(--line)] bg-gradient-to-b from-black/40 to-black/70 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>{t("brand")}</SectionLabel>
            <h2 className="font-display max-w-3xl text-3xl font-bold sm:text-4xl">
              {t("whyTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
              {t("whyLead")}
            </p>
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              {reasons.map((reason, index) => (
                <motion.div
                  key={reason.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.06 }}
                  className="border-l border-brand/40 pl-5"
                >
                  <div className="text-xs font-semibold tracking-[0.2em] text-brand">
                    0{index + 1}
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-bold">
                    {t(reason.title)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {t(reason.text)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-t border-[var(--line)] py-20">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-pink-400/5 to-transparent" />
          <div className="relative mx-auto max-w-6xl px-6">
            <SectionLabel>01 · 02 · 03</SectionLabel>
            <h2 className="font-display max-w-2xl text-3xl font-bold sm:text-4xl">
              {t("howTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-base text-zinc-300">{t("howLead")}</p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="relative"
                >
                  <div className="font-display text-5xl font-extrabold text-white/10">
                    {index + 1}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold">{t(step.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {t(step.text)}
                  </p>
                  {index < steps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-8 hidden h-4 w-4 text-brand/50 md:block" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-t border-[var(--line)] bg-black/50 py-20">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-400/5 to-transparent" />
          <div className="relative mx-auto max-w-6xl px-6">
            <SectionLabel>Flowly</SectionLabel>
            <h2 className="font-display max-w-2xl text-3xl font-bold sm:text-4xl">
              {t("landingSection")}
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                  className="feature-panel rounded-3xl border border-[var(--line)] bg-surface p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-paper">
                      <feature.icon className="h-4 w-4 text-brand" />
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${feature.chip}`}
                    >
                      {t("extra")}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold">
                    {t(feature.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {t(feature.text)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>{t("brand")}</SectionLabel>
            <h2 className="font-display max-w-3xl text-3xl font-bold sm:text-4xl">
              {t("audienceTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-zinc-300">{t("audienceLead")}</p>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {audiences.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07 }}
                >
                  <h3 className={`font-display text-xl font-bold ${item.tone}`}>
                    {t(item.title)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {t(item.text)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--line)] bg-black/60 py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <SectionLabel>{t("compareTitle")}</SectionLabel>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                {t("compareTitle")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-300">
                {t("compareLead")}
              </p>
            </div>
            <ul className="space-y-4">
              {compares.map((key, index) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 text-sm leading-relaxed text-zinc-200"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t(key)}
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>{t("pricing")}</SectionLabel>
            <h2 className="font-display max-w-2xl text-3xl font-bold sm:text-4xl">
              {t("pricingTitle")}
            </h2>
            <p className="mt-3 max-w-xl text-zinc-300">{t("pricingLead")}</p>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-[var(--line)] bg-surface/80 p-7">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Free
                </div>
                <div className="mt-2 font-display text-4xl font-bold">$0</div>
                <p className="mt-2 text-sm text-zinc-400">{t("freePlanLead")}</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-200">
                  {[
                    "priceFree1",
                    "priceFree2",
                    "priceFree3",
                    "priceFree4",
                  ].map((key) => (
                    <li key={key} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {t(key as MessageKey)}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 inline-flex rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold hover:border-brand/40"
                >
                  {t("startFree")}
                </Link>
              </div>
              <div className="relative overflow-hidden rounded-[28px] border border-accent/40 bg-gradient-to-br from-accent/10 via-surface to-brand/10 p-7">
                <div className="absolute right-5 top-5 chip-pink rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                  PRO
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  Pro
                </div>
                <div className="mt-2 font-display text-4xl font-bold">
                  $12
                  <span className="text-base font-medium text-muted">
                    /{t("mo")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{t("proPlanLead")}</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-100">
                  {[
                    "pricePro1",
                    "pricePro2",
                    "pricePro3",
                    "pricePro4",
                    "pricePro5",
                  ].map((key) => (
                    <li key={key} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {t(key as MessageKey)}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="cta-primary mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-black"
                >
                  {t("startPro")}
                </Link>
                <p className="mt-3 text-[11px] text-muted">{t("stripeBillingHint")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[32px] border border-[var(--line)] bg-gradient-to-br from-cyan-400/10 via-surface to-pink-400/10 px-8 py-12 sm:px-12"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
              <h2 className="font-display relative max-w-2xl text-3xl font-bold sm:text-4xl">
                {t("ctaTitle")}
              </h2>
              <p className="relative mt-4 max-w-xl text-base text-zinc-300">
                {t("ctaLead")}
              </p>
              <div className="relative mt-8 flex flex-wrap items-center gap-3">
                <DemoBoardButton variant="primary" labelKey="openDemo" />
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  {t("startFree")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-[var(--line)] bg-black/70 py-12">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <div className="font-display text-lg font-extrabold">
                <span className="neon-cyan">Flow</span>
                <span className="neon-pink">ly</span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-zinc-400">{t("landingBadge")}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("product")}
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
                <Link href="/login" className="hover:text-brand">
                  {t("login")}
                </Link>
                <Link href="/register" className="hover:text-brand">
                  {t("startFree")}
                </Link>
                <Link href="/support" className="hover:text-brand">
                  {t("support")}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("legal")}
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
                <Link href="/legal/privacy" className="hover:text-brand">
                  {t("privacyPolicy")}
                </Link>
                <Link href="/legal/terms" className="hover:text-brand">
                  {t("termsOfService")}
                </Link>
                <Link href="/legal/security" className="hover:text-brand">
                  {t("securityPolicy")}
                </Link>
                <Link href="/legal/cookies" className="hover:text-brand">
                  {t("cookiePolicy")}
                </Link>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-6xl border-t border-[var(--line)] px-6 pt-4 text-xs text-muted">
            © {new Date().getFullYear()} Flowly
          </div>
        </footer>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="h-px w-10 bg-accent" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        {children}
      </span>
    </div>
  );
}
