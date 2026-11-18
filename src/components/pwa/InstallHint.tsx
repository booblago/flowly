"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallHint({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const isStandalone =
      media.matches ||
      // iOS Safari
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setStandalone(isStandalone);

    const ua = navigator.userAgent;
    setIos(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));

    const stored = localStorage.getItem("flowly-install-dismissed");
    setDismissed(stored === "1" || isStandalone);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (standalone || dismissed) return null;

  function dismiss() {
    localStorage.setItem("flowly-install-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-brand/30 bg-brand/10 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted hover:text-ink"
        aria-label={t("close")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/40 bg-brand/15 text-brand">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("installTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            {ios ? t("installIosHint") : t("installAndroidHint")}
          </p>
          {deferred && !ios && (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-bold text-black"
            >
              <Download className="h-3.5 w-3.5" />
              {t("installCta")}
            </button>
          )}
          {ios && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent">
              <Share className="h-3.5 w-3.5" />
              {t("installIosShare")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
