"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LanguageContext";

export function AutomationsHeader({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}) {
  const t = useT();
  return (
    <>
      <Link
        href={`/board/${boardId}`}
        className="text-sm font-medium text-brand hover:underline"
      >
        {t("backToBoard")}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">
        {t("automationsTitle")} · {boardName}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{t("automationsHint")}</p>
    </>
  );
}
