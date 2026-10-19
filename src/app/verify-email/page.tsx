"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";

function VerifyInner() {
  const t = useT();
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("verifyMissingToken"));
      return;
    }
    void (async () => {
      const res = await fetch(`/api/verify-email?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || t("verifyFailed"));
        return;
      }
      setStatus("ok");
      setMessage(t("verifySuccess"));
    })();
  }, [token, t]);

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-[28px] p-8 text-center">
        <Link href="/" className="font-display text-2xl font-extrabold">
          <span className="neon-cyan">Flow</span>
          <span className="neon-pink">ly</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold">{t("verifyEmailTitle")}</h1>
        <p className={`mt-3 text-sm ${status === "error" ? "text-rose" : "text-muted"}`}>
          {status === "loading" ? t("verifyingEmail") : message}
        </p>
        {status === "ok" && (
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
          >
            {t("login")}
          </Link>
        )}
        {status === "error" && (
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
          >
            {t("createAccount")}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}