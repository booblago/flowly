"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { useT } from "@/lib/i18n/LanguageContext";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed");
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="glass w-full max-w-md rounded-[28px] p-8"
      >
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
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t("email")}
          <input
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-paper px-4 py-3 outline-none ring-brand focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
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
            minLength={6}
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-60"
        >
          {loading ? t("creating") : t("createAccount")}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand">
            {t("signIn")}
          </Link>
        </p>
      </form>
    </div>
  );
}
