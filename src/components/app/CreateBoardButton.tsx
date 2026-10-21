"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";

const TEMPLATE_COLUMNS: Record<
  "blank" | "delivery" | "support" | "content",
  string[]
> = {
  blank: ["To do"],
  delivery: ["Backlog", "Ready", "In Progress", "Review", "Done"],
  support: ["New", "Triaged", "Working", "Waiting", "Resolved"],
  content: ["Ideas", "Writing", "Edit", "Published"],
};

export function CreateBoardButton({
  workspaceId,
  boardCount = 0,
  maxBoards = 3,
  variant = "button",
}: {
  workspaceId: string;
  boardCount?: number;
  maxBoards?: number;
  variant?: "button" | "icon" | "empty";
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<
    "blank" | "delivery" | "support" | "content"
  >("blank");
  const [error, setError] = useState("");

  const atLimit = boardCount >= maxBoards;

  const templates = [
    {
      id: "blank" as const,
      label: t("templateBlank"),
      hint: t("templateBlankHint"),
    },
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function create() {
    if (atLimit) {
      setError(t("boardLimitReached"));
      return;
    }
    if (!name.trim()) {
      setError(t("boardNameRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: name.trim(),
          template,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        board?: { id?: string };
      };
      if (!res.ok) {
        setError(data.error || t("saveFailed"));
        return;
      }
      setOpen(false);
      setName("");
      setTemplate("blank");
      if (data.board?.id) {
        router.push(`/board/${data.board.id}`);
        router.refresh();
      }
    } catch {
      setError(t("saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  function openDialog() {
    if (atLimit) {
      setError(t("boardLimitReached"));
      setOpen(true);
      return;
    }
    setError("");
    setOpen(true);
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={openDialog}
        disabled={loading}
        title={atLimit ? t("boardLimitReached") : t("newBoard")}
        aria-label={t("newBoard")}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white text-black transition hover:bg-zinc-100 disabled:opacity-60"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    ) : (
      <button
        type="button"
        onClick={openDialog}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {loading ? t("creating") : t("newBoard")}
      </button>
    );

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label={t("close")}
            onClick={() => !loading && setOpen(false)}
          />
          <form
            className="relative z-10 max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c0c0e] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{t("newBoard")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="text-sm text-zinc-500 hover:text-white disabled:opacity-50"
              >
                {t("close")}
              </button>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              {t("boardsUsed")}: {boardCount} / {maxBoards}
            </p>

            <label className="mt-4 block text-sm font-medium">
              {t("boardName")}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("boardNamePlaceholder")}
                enterKeyHint="done"
                autoComplete="off"
                disabled={atLimit}
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-base outline-none ring-brand focus:ring-2 disabled:opacity-50 sm:text-sm"
                autoFocus
              />
            </label>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("adaptiveTemplate")}
            </p>
            <div className="mt-2 space-y-2">
              {templates.map((item) => {
                const columns = TEMPLATE_COLUMNS[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    disabled={atLimit}
                    className={`flex w-full flex-col rounded-2xl border px-3 py-3 text-left transition disabled:opacity-50 ${
                      template === item.id
                        ? "border-white/40 bg-white/10"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-xs text-zinc-500">{item.hint}</span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {columns.map((col) => (
                        <span
                          key={col}
                          className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-3 text-sm text-rose">{error}</p>}

            <button
              type="submit"
              disabled={loading || atLimit}
              className="mt-5 w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-black disabled:opacity-60"
            >
              {loading ? t("creating") : t("createBoard")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
