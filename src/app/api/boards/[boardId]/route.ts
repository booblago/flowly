import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBoardBundle, userCanAccessBoard } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { boardId } = await context.params;
  if (!(await userCanAccessBoard(session.user.id, boardId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const bundle = await getBoardBundle(boardId);
  if (!bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}
