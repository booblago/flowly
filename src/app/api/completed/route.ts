import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCompletedCards } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const value =
    filter === "week" || filter === "all" || filter === "today" ? filter : "today";
  const data = await getCompletedCards(session.user.id, value);
  return NextResponse.json(data);
}
