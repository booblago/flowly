import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAnalytics } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { AnalyticsView } from "@/components/app/AnalyticsView";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const analytics = await getAnalytics(session.user.id);

  return (
    <AppShell>
      <AnalyticsView analytics={analytics} />
    </AppShell>
  );
}
