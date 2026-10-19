"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";

const KEY = "flowly-cookie-consent";

export function CookieBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(KEY));
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[var(--line)] bg-surface/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-200">
          {t("cookiesP1")}{" "}
          <Link href="/legal/cookies" className="font-semibold text-brand hover:underline">
            {t("cookiePolicy")}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setVisible(false);
          }}
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-black"
        >
          {t("acceptCookies")}
        </button>
      </div>
    </div>
  );
}
