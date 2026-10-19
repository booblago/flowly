import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createAutomation,
  getAutomations,
  getUserPlan,
  installSlaEscalationPack,
  runOverdueAutomations,
  userCanAccessBoard,
} from "@/lib/db";
import { ALL_TRIGGERS, PLAN_LIMITS } from "@/lib/plans";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const boardId = new URL(req.url).searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json({ error: "boardId required" }, { status: 400 });
  }
  if (!(await userCanAccessBoard(session.user.id, boardId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const automations = await getAutomations(boardId);
  const plan = await getUserPlan(session.user.id);
  return NextResponse.json({
    automations,
    plan,
    limits: PLAN_LIMITS[plan],
  });
}

const conditionSchema = z.object({
  field: z.enum(["priority", "listId", "hasAssignee", "labelId"]),
  op: z.enum(["eq", "neq", "includes", "empty", "not_empty"]),
  value: z.string(),
});

const createSchema = z.object({
  boardId: z.string(),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  trigger: z.enum(ALL_TRIGGERS as unknown as [string, ...string[]]),
  fromListId: z.string().nullable().optional(),
  toListId: z.string().nullable().optional(),
  conditions: z.array(conditionSchema).optional().default([]),
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
    .min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  if (json?.runOverdue === true) {
    await runOverdueAutomations(session.user.id);
    return NextResponse.json({ ok: true });
  }
  if (json?.installSlaPack === true && json.boardId) {
    try {
      const automation = await installSlaEscalationPack(
        String(json.boardId),
        session.user.id,
      );
      return NextResponse.json({ automation });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }
  try {
    const body = createSchema.parse(json);
    const automation = await createAutomation(
      {
        boardId: body.boardId,
        name: body.name,
        enabled: body.enabled,
        trigger: body.trigger as never,
        fromListId: body.fromListId ?? null,
        toListId: body.toListId ?? null,
        conditions: body.conditions,
        actions: body.actions,
      },
      session.user.id,
    );
    return NextResponse.json({ automation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = /Pro|Free plan|requires/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
