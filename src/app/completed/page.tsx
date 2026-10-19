import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCompletedCards } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { CompletedView } from "@/components/app/CompletedView";

export default async function CompletedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const data = await getCompletedCards(session.user.id, "today");

  return (
    <AppShell>
      <CompletedView
        initialFilter="today"
        items={data.items}
        counts={data.counts}
      />
    </AppShell>
  );
}
