import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { OwnerAccountsView } from "@/components/app/OwnerAccountsView";
import { isOwnerEmail } from "@/lib/owner";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isOwnerEmail(session.user.email)) redirect("/dashboard");

  return (
    <AppShell>
      <OwnerAccountsView />
    </AppShell>
  );
}
