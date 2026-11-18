import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { AccountSettings } from "@/components/app/AccountSettings";

type AccountSearch = { upgrade?: string; billing?: string; session_id?: string };

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<AccountSearch>;
}) {
  const session = await auth();
  const params = (await searchParams) ?? {};

  if (!session?.user?.id) {
    const q = new URLSearchParams();
    if (params.upgrade) q.set("upgrade", params.upgrade);
    if (params.billing) q.set("billing", params.billing);
    if (params.session_id) q.set("session_id", params.session_id);
    const dest = q.size > 0 ? `/account?${q.toString()}` : "/account";
    redirect(`/login?callbackUrl=${encodeURIComponent(dest)}`);
  }

  return (
    <AppShell>
      <AccountSettings />
    </AppShell>
  );
}
