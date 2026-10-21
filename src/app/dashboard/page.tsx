import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ensureSessionUser,
  getBoardsForUser,
  getUserPlan,
  getWorkspacesForUser,
} from "@/lib/db";
import { planLimits } from "@/lib/plans";
import { AppShell } from "@/components/app/AppShell";
import { DashboardView } from "@/components/app/DashboardView";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ensureSessionUser({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });

  const [boards, workspaces, plan] = await Promise.all([
    getBoardsForUser(session.user.id),
    getWorkspacesForUser(session.user.id),
    getUserPlan(session.user.id),
  ]);

  return (
    <AppShell>
      <DashboardView
        boards={boards}
        workspaceId={workspaces[0]?.id}
        maxBoards={planLimits(plan).boards}
      />
    </AppShell>
  );
}
