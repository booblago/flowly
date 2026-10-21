import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteCard, updateCard } from "@/lib/db";
import type { Priority } from "@/lib/types";

const patchSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  estimateHours: z.number().optional(),
  loggedHours: z.number().optional(),
  checklist: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        done: z.boolean(),
      }),
    )
    .optional(),
  comments: z
    .array(
      z.object({
        id: z.string(),
        userId: z.string(),
        text: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
  customFieldValues: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { cardId } = await context.params;
  try {
    const body = patchSchema.parse(await req.json());
    const card = await updateCard(
      cardId,
      {
        ...body,
        priority: body.priority as Priority | undefined,
      },
      session.user.id,
    );
    if (!card) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { cardId } = await context.params;
  try {
    await deleteCard(cardId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
