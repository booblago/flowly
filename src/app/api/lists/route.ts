import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createList, reorderLists } from "@/lib/db";

const createSchema = z.object({
  boardId: z.string(),
  title: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = createSchema.parse(await req.json());
    const list = await createList(body.boardId, body.title, session.user.id);
    return NextResponse.json({ list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const reorderSchema = z.object({
  boardId: z.string(),
  orderedIds: z.array(z.string()),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = reorderSchema.parse(await req.json());
  await reorderLists(body.boardId, body.orderedIds, session.user.id);
  return NextResponse.json({ ok: true });
}
