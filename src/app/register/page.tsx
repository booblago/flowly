"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { safeCallbackUrl } from "@/lib/access";
import { useT } from "@/lib/i18n/LanguageContext";

function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const rawCallback = params.get("callbackUrl");
  const afterLogin = safeCallbackUrl(rawCallback, "/dashboard");
  const loginHref = rawCallback
    ? `/login?callbackUrl=${encodeURIComponent(afterLogin)}`
    : "/login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(
        data.code === "EMAIL_TAKEN" || data.error === "Email already registered"
          ? t("emailTaken")
          : data.error || t("registerFailed"),
      );
      return;
    }
    setDone(true);
    setNeedsVerification(Boolean(data.needsVerification));
    setEmailSent(Boolean(data.emailSent));
    setVerifyUrl(data.verifyUrl || null);
    if (!data.needsVerification) {
      router.push(loginHref);
    }
  }

  if (done) {
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-[28px] p-8">
          <Link href="/" className="font-display text-2xl font-extrabold">
            <span className="neon-cyan">Flow</span>
            <span className="neon-pink">ly</span>
          </Link>
          <h1 className="mt-6 font-display text-3xl font-bold">
            {needsVerification ? t("checkYourEmail") : t("accountReady")}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {needsVerification
              ? emailSent
                ? t("verifyEmailSent").replace("{email}", email)
                : t("verifyEmailManual")
              : t("accountReadyHint")}
          </p>
          {needsVerification && verifyUrl && (
            <a
              href={verifyUrl}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white py-3 text-sm font-bold text-black"
            >
              {t("openVerifyLink")}
            </a>
          )}
          <Link
            href={loginHref}
            className={`mt-4 block text-center text-sm font-semibold ${
              needsVerification
                ? "text-brand hover:underline"
                : "rounded-full bg-brand py-3 text-black hover:opacity-90"
            }`}
          >
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="glass w-full max-w-md rounded-[28px] p-8"
      >
        <button
          type="button"
          onClick={goBack}
          className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-sm font-medium text-muted hover:text-ink md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("goBack")}
        </button>
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-extrabold">
            <span className="neon-cyan">Flow</span>
            <span className="neon-pink">ly</span>
          </Link>
          <LanguageSwitcher compact />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">
          {t("createWorkspace")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("startAdaptive")}</p>
        <label className="mt-6 block text-sm font-medium">
          {t("name")}
          <input
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-paper px-4 py-3 outline-none ring-brand focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t("email")}
          <input
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-paper px-4 py-3 outline-none ring-brand focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
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
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-full bg-white py-3 text-sm font-bold text-black disabled:opacity-60"
        >
          {loading ? t("creating") : t("createAccount")}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          {t("haveAccount")}{" "}
          <Link href={loginHref} className="text-brand hover:underline">
            {t("login")}
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
