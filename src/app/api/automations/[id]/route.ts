import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteAutomation, updateAutomation } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  trigger: z
    .enum(["card_created", "card_moved", "priority_set", "due_overdue"])
    .optional(),
  fromListId: z.string().nullable().optional(),
  toListId: z.string().nullable().optional(),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "set_priority",
          "add_label",
          "assign_user",
          "move_to_list",
          "notify",
          "set_custom_field",
          "add_checklist_item",
        ]),
        value: z.string(),
      }),
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const body = patchSchema.parse(await req.json());
    const automation = await updateAutomation(id, body, session.user.id);
    if (!automation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ automation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    await deleteAutomation(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
