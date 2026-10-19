import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBoardBundle, getUserPlan } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { CalendarView } from "@/components/board/CalendarView";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { boardId } = await params;
  const bundle = await getBoardBundle(boardId);
  if (!bundle) notFound();
  const plan = await getUserPlan(session.user.id);

  return (
    <AppShell>
      <CalendarView
        boardId={boardId}
        boardName={bundle.board.name}
        cards={bundle.cards}
        plan={plan}
      />
    </AppShell>
  );
}
