"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@/lib/types";
import { CreateBoardButton } from "@/components/app/CreateBoardButton";
import { useT } from "@/lib/i18n/LanguageContext";

export function DashboardView({
  boards,
  workspaceId,
  maxBoards = 3,
}: {
  boards: Board[];
  workspaceId?: string;
  maxBoards?: number;
}) {
  const t = useT();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const accents = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#a78bfa"];

  async function removeBoard(board: Board) {
    const ok = window.confirm(t("deleteBoardConfirm").replace("{name}", board.name));
    if (!ok) return;
    setDeletingId(board.id);
    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(data.error || t("saveFailed"));
        return;
      }
      router.refresh();
    } catch {
      window.alert(t("saveFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("yourBoards")}</h1>
          <p className="mt-1 text-sm text-muted">{t("boardsHint")}</p>
          <p className="mt-2 text-xs font-medium text-zinc-500">
            {t("boardsUsed")}: {boards.length} / {maxBoards}
          </p>
        </div>
        {workspaceId && (
          <CreateBoardButton
            workspaceId={workspaceId}
            boardCount={boards.length}
            maxBoards={maxBoards}
            variant="icon"
          />
        )}
      </div>

      {!workspaceId && (
        <p className="mt-6 rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
          {t("workspaceMissing")}
        </p>
      )}

      {boards.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-white/15 bg-surface/60 px-5 py-10 text-center">
          <p className="font-display text-xl font-bold">{t("noBoardsYet")}</p>
          <p className="mt-2 text-sm text-muted">{t("noBoardsHint")}</p>
          {workspaceId && (
            <div className="mt-5 flex justify-center">
              <CreateBoardButton
                workspaceId={workspaceId}
                boardCount={boards.length}
                maxBoards={maxBoards}
                variant="empty"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board, i) => {
            const accent = accents[i % accents.length];
            const busy = deletingId === board.id;
            return (
              <div
                key={board.id}
                className="group relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-surface transition hover:translate-y-[-2px] hover:border-white/20"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: accent }}
                />
                <button
                  type="button"
                  onClick={() => void removeBoard(board)}
                  disabled={busy}
                  title={t("deleteBoard")}
                  aria-label={t("deleteBoard")}
                  className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/70 text-zinc-300 transition hover:border-rose/40 hover:bg-rose/15 hover:text-rose disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link href={`/board/${board.id}`} className="block p-5 pr-12">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">
                    {t("board")} · {t("sla")} {board.slaDays}d
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold">
                    {board.name}
                  </div>
                  {board.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">
                      {board.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted/70">{t("emptyBoardHint")}</p>
                  )}
                  <div
                    className="mt-6 text-sm font-medium"
                    style={{ color: accent }}
                  >
                    {t("openBoard")}
                  </div>
                </Link>
              </div>
            );
          })}

          {workspaceId && boards.length < maxBoards && (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-white/20 bg-transparent p-5 text-sm text-muted">
              <CreateBoardButton
                workspaceId={workspaceId}
                boardCount={boards.length}
                maxBoards={maxBoards}
                variant="icon"
              />
              <span>{t("newBoard")}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
