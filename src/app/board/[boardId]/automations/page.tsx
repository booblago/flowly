import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBoardBundle, getUserPlan } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { AutomationsPanel } from "@/components/board/AutomationsPanel";
import { AutomationsHeader } from "@/components/board/AutomationsHeader";

export default async function AutomationsPage({
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
      <AutomationsHeader boardId={boardId} boardName={bundle.board.name} />
      <div className="mt-6">
        <AutomationsPanel
          boardId={boardId}
          lists={bundle.lists}
          labels={bundle.board.labels}
          members={bundle.members}
          customFields={bundle.board.customFields}
          initial={bundle.automations}
          plan={plan}
        />
      </div>
    </AppShell>
  );
}
