import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSmartInbox } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { InboxView } from "@/components/app/InboxView";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const inbox = await getSmartInbox(session.user.id);

  return (
    <AppShell>
      <InboxView inbox={inbox} />
    </AppShell>
  );
}
