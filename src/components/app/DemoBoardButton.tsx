"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_BOARD_PATH, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { useT } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "primary" | "link" | "secondary";
  labelKey?: "openDemo" | "demoBoard";
};

export function DemoBoardButton({
  className,
  variant = "primary",
  labelKey = "demoBoard",
}: Props) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function enterDemo() {
    if (loading) return;
    setLoading(true);
    const res = await signIn("credentials", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      return;
    }
    router.push(DEMO_BOARD_PATH);
    router.refresh();
  }

  const base =
    variant === "link"
      ? "font-semibold text-brand hover:underline disabled:opacity-60"
      : variant === "secondary"
        ? "cta-secondary rounded-full border border-[var(--line)] bg-surface/80 px-6 py-3 text-sm font-semibold text-ink"
        : "cta-primary rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black";

  return (
    <button
      type="button"
      onClick={() => void enterDemo()}
      disabled={loading}
      className={cn(base, className)}
    >
      <span className="relative z-10">
        {loading ? t("openingDemo") : t(labelKey)}
      </span>
    </button>
  );
}
