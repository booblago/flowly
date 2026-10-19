"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";

export function CreateBoardButton({ workspaceId }: { workspaceId: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const templates = [
    {
      id: "delivery" as const,
      label: t("templateDelivery"),
      hint: t("templateDeliveryHint"),
    },
    {
      id: "support" as const,
      label: t("templateSupport"),
      hint: t("templateSupportHint"),
    },
    {
      id: "content" as const,
      label: t("templateContent"),
      hint: t("templateContentHint"),
    },
  ];

  async function create(template: "delivery" | "support" | "content") {
    const name = window.prompt(
      t("boardNamePrompt"),
      templates.find((item) => item.id === template)?.label,
    );
    if (!name?.trim()) return;
    setLoading(true);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name: name.trim(),
        template,
      }),
    });
    const data = await res.json();
    setLoading(false);
    setOpen(false);
    if (data.board?.id) {
      router.push(`/board/${data.board.id}`);
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
      >
        {loading ? t("creating") : t("newBoard")}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[var(--line)] bg-surface p-2 shadow-xl">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("adaptiveTemplate")}
          </div>
          {templates.map((item) => (
            <button
              key={item.id}
              onClick={() => void create(item.id)}
              className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-paper"
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="text-xs text-muted">{item.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
