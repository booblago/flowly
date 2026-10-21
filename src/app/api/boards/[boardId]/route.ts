import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteBoard,
  getBoardBundle,
  userCanAccessBoard,
} from "@/lib/db";

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

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { boardId } = await context.params;
  try {
    await deleteBoard(boardId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
