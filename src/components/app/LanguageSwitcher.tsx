"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Locale } from "@/lib/i18n/translations";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, locales, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink"
        aria-label={t("language")}
        title={t("language")}
      >
        <Languages className="h-3.5 w-3.5 text-brand" />
        {!compact && <span className="hidden sm:inline">{t("language")}</span>}
        <span className="text-brand">
          {locales.find((l) => l.code === locale)?.short}
        </span>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-surface shadow-xl">
            {locales.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLocale(item.code as Locale);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-paper ${
                  locale === item.code ? "text-brand" : "text-ink"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-muted">{item.short}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
