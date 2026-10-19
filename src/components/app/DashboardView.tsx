"use client";

import Link from "next/link";
import type { Board } from "@/lib/types";
import { CreateBoardButton } from "@/components/app/CreateBoardButton";
import { useT } from "@/lib/i18n/LanguageContext";

export function DashboardView({
  boards,
  workspaceId,
}: {
  boards: Board[];
  workspaceId?: string;
}) {
  const t = useT();
  const accents = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#a78bfa"];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("yourBoards")}</h1>
          <p className="mt-1 text-sm text-muted">{t("boardsHint")}</p>
        </div>
        {workspaceId && <CreateBoardButton workspaceId={workspaceId} />}
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
              <CreateBoardButton workspaceId={workspaceId} />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board, i) => {
            const accent = accents[i % accents.length];
            return (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                className="group relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-surface p-5 transition hover:translate-y-[-2px] hover:border-white/20"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: accent }}
                />
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
                  <p className="mt-2 text-sm text-muted/70">&nbsp;</p>
                )}
                <div
                  className="mt-6 text-sm font-medium"
                  style={{ color: accent }}
                >
                  {t("openBoard")}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
