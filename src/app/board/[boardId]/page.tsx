import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBoardBundle, userCanAccessBoard } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { BoardView } from "@/components/board/BoardView";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { boardId } = await params;
  if (!(await userCanAccessBoard(session.user.id, boardId))) {
    redirect("/dashboard");
  }
  const bundle = await getBoardBundle(boardId);
  if (!bundle) notFound();

  return (
    <AppShell>
      <BoardView
        board={bundle.board}
        lists={bundle.lists}
        cards={bundle.cards}
        members={bundle.members}
        activities={bundle.activities}
      />
    </AppShell>
  );
}
