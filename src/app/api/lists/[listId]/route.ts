import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteList, updateList } from "@/lib/db";

const patchSchema = z.object({
  title: z.string().optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
  defaultPriority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  accent: z.string().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ listId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { listId } = await context.params;
  try {
    const body = patchSchema.parse(await req.json());
    const list = await updateList(listId, body, session.user.id);
    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ listId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { listId } = await context.params;
  try {
    await deleteList(listId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
