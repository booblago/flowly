import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { AccountSettings } from "@/components/app/AccountSettings";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell>
      <AccountSettings />
    </AppShell>
  );
}
