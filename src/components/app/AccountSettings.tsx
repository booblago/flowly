"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  confirmBillingSession,
  openBillingPortal,
  startProCheckout,
} from "@/lib/billing-client";
import type { PublicUser } from "@/lib/types";
import { initials, userImageSrc } from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageContext";

const COLORS = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#a78bfa", "#fb7185"];

export function AccountSettings() {
  const t = useT();
  const { update } = useSession();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");
  const [avatarColor, setAvatarColor] = useState("#22d3ee");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) return;
        setUser(d.user);
        setName(d.user.name || "");
        setEmail(d.user.email || "");
        setBio(d.user.bio || "");
        setCompany(d.user.company || "");
        setAvatarColor(d.user.avatarColor || "#22d3ee");
        setAvatarUrl(d.user.avatarUrl || null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    const sessionId = params.get("session_id");
    if (billing === "cancel") {
      setMessage(t("billingCanceled"));
      window.history.replaceState({}, "", "/account");
      return;
    }
    if (billing === "success" && sessionId) {
      void (async () => {
        setBillingBusy(true);
        const result = await confirmBillingSession(sessionId);
        setBillingBusy(false);
        if (result.error) {
          setError(result.error);
        } else if (result.user) {
          setUser(result.user);
          setMessage(t("billingSuccess"));
        }
        window.history.replaceState({}, "", "/account");
      })();
    }
  }, [t]);

  async function onPhoto(file: File | null) {
    if (!file) return;
    if (file.size > 650_000) {
      setError(t("imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        bio,
        company,
        avatarColor,
        avatarUrl,
        ...(password ? { password } : {}),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || t("saveFailed"));
      return;
    }
    setUser(data.user);
    setPassword("");
    setMessage(t("profileSaved"));
    await update({
      user: {
        name: data.user.name,
        email: data.user.email,
        image: data.user.avatarUrl || data.user.avatarColor,
      },
    });
  }

  const preview = userImageSrc({ avatarUrl, avatarColor });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("profile")}</h1>
        <p className="mt-1 text-sm text-muted">{t("accountHint")}</p>
      </div>

      <section
        id="photo"
        className="rounded-[24px] border border-[var(--line)] bg-surface p-5"
      >
        <h2 className="font-display text-lg font-bold">{t("profilePhoto")}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-black"
            style={{ background: preview.kind === "color" ? preview.value : "#111113" }}
          >
            {preview.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.value} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(name || "U")
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-semibold text-black">
              {t("uploadPhoto")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPhoto(e.target.files?.[0] || null)}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="ml-2 text-sm font-medium text-muted hover:text-ink"
              >
                {t("removePhoto")}
              </button>
            )}
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    avatarColor === c ? "border-white" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            user?.plan === "pro" ? "chip-pink" : "chip-violet"
          }`}
        >
          {(user?.plan === "pro" ? "PRO" : "FREE")}
        </span>
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
        >
          {t("comparePlans")}
        </button>
      </section>

      {planOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm"
            aria-label={t("close")}
            onClick={() => setPlanOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-[0_40px_100px_rgba(0,0,0,.65)] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Flowly
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
                  {t("planCompareTitle")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPlanOpen(false)}
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                {t("close")}
              </button>
            </div>

            <div className="overflow-auto px-6 py-5">
              <div className="grid grid-cols-[1.2fr_0.7fr_0.9fr] gap-x-3 border-b border-white/10 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                <span>{t("featureCol")}</span>
                <span className="text-center">
                  Free
                  {user?.plan !== "pro" ? (
                    <span className="ml-1 text-brand">· {t("currentPlan")}</span>
                  ) : null}
                </span>
                <span className="text-center text-white">
                  Pro
                  {user?.plan === "pro" ? (
                    <span className="ml-1 text-brand">· {t("currentPlan")}</span>
                  ) : (
                    <span className="ml-1 font-bold normal-case tracking-normal text-white">
                      $12/{t("mo")}
                    </span>
                  )}
                </span>
              </div>

              {(
                [
                  ["cmpBoards", "cmpFreeBoards", "cmpProBoards"],
                  ["cmpRules", "cmpFreeRules", "cmpProRules"],
                  ["cmpActions", "cmpFreeActions", "cmpProActions"],
                  ["cmpSla", "cmpFreeNo", "cmpProYes"],
                  ["cmpRecurring", "cmpFreeNo", "cmpProYes"],
                  ["cmpReports", "cmpFreeNo", "cmpProYes"],
                  ["cmpWorkload", "cmpFreeNo", "cmpProYes"],
                ] as const
              ).map(([feature, freeVal, proVal]) => (
                <div
                  key={feature}
                  className="grid grid-cols-[1.2fr_0.7fr_0.9fr] gap-x-3 border-b border-white/[0.06] py-3.5 text-sm"
                >
                  <span className="text-zinc-300">{t(feature)}</span>
                  <span className="text-center text-zinc-500">{t(freeVal)}</span>
                  <span className="text-center font-medium text-white">{t(proVal)}</span>
                </div>
              ))}

              <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                {t("whyUpgradeBody")}
              </p>
            </div>

            <div className="border-t border-white/10 px-6 py-5">
              {user?.plan !== "pro" ? (
                <button
                  type="button"
                  disabled={billingBusy}
                  className="w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-60"
                  onClick={async () => {
                    setBillingBusy(true);
                    setError("");
                    const result = await startProCheckout();
                    if (result.error) {
                      setBillingBusy(false);
                      setError(result.error);
                    }
                  }}
                >
                  {billingBusy ? t("redirectingCheckout") : t("startPro")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={billingBusy}
                  className="w-full rounded-2xl border border-white/15 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-60"
                  onClick={async () => {
                    setBillingBusy(true);
                    setError("");
                    const result = await openBillingPortal();
                    if (result.error) {
                      setBillingBusy(false);
                      setError(result.error);
                    }
                  }}
                >
                  {billingBusy ? t("redirectingCheckout") : t("manageBilling")}
                </button>
              )}
              <p className="mt-3 text-center text-[11px] text-zinc-500">
                {t("stripeSecureHint")}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-[24px] border border-[var(--line)] bg-surface p-5 space-y-4">
        <h2 className="font-display text-lg font-bold">{t("account")}</h2>
        <Field label={t("name")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </Field>
        <Field label={t("email")}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </Field>
        <Field label={t("company")}>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </Field>
        <Field label={t("bio")}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </Field>
        <Field label={t("newPassword")}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </Field>
        {user && (
          <p className="text-xs text-muted">
            ID: {user.id}
          </p>
        )}
      </section>

      {error && <p className="text-sm text-rose">{error}</p>}
      {message && <p className="text-sm text-lime">{message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          {saving ? t("saving") : t("saveChanges")}
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-muted hover:text-ink"
        >
          {t("switchAccount")}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
