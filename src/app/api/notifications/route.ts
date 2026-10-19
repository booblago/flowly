import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotifications, markNotificationsRead } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notifications = await getNotifications(session.user.id);
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await markNotificationsRead(session.user.id);
  return NextResponse.json({ ok: true });
}
