"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { DemoBoardButton } from "@/components/app/DemoBoardButton";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { safeCallbackUrl } from "@/lib/access";
import { useT } from "@/lib/i18n/LanguageContext";

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const pre = await fetch("/api/login-precheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const preData = await pre.json();
    if (!pre.ok) {
      setLoading(false);
      if (pre.status === 429) setError(preData.error || t("rateLimited"));
      else if (preData.error === "EMAIL_NOT_VERIFIED") setError(t("emailNotVerified"));
      else setError(t("invalidCreds"));
      return;
    }
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("invalidCreds"));
      return;
    }
    router.push(safeCallbackUrl(params.get("callbackUrl")));
    router.refresh();
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="glass w-full max-w-md rounded-[28px] p-8"
        autoComplete="on"
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-extrabold">
            <span className="neon-cyan">Flow</span>
            <span className="neon-pink">ly</span>
          </Link>
          <LanguageSwitcher compact />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">{t("welcomeBack")}</h1>
        <p className="mt-2 text-sm text-muted">{t("useDemo")}</p>
        <label className="mt-6 block text-sm font-medium">
          {t("email")}
          <input
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-paper px-4 py-3 outline-none ring-brand focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t("password")}
          <input
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-paper px-4 py-3 outline-none ring-brand focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-full bg-brand py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t("signingIn") : t("signIn")}
        </button>

        <div className="mt-5 rounded-2xl border border-brand/25 bg-brand/5 p-4">
          <p className="text-sm font-medium text-ink">{t("demoBoardHint")}</p>
          <p className="mt-1 text-xs text-muted">{t("useDemoHint")}</p>
          <DemoBoardButton
            variant="primary"
            labelKey="demoBoard"
            className="mt-3 w-full py-2.5"
          />
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-accent">
            {t("register")}
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
