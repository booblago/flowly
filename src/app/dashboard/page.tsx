import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBoardsForUser, getWorkspacesForUser } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { DashboardView } from "@/components/app/DashboardView";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [boards, workspaces] = await Promise.all([
    getBoardsForUser(session.user.id),
    getWorkspacesForUser(session.user.id),
  ]);

  return (
    <AppShell>
      <DashboardView boards={boards} workspaceId={workspaces[0]?.id} />
    </AppShell>
  );
}
