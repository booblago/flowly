import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  deleteUserAccount,
  listUsersForAdmin,
  setUserPlan,
  toPublicUser,
  findUserById,
} from "@/lib/db";
import { isOwnerEmail } from "@/lib/owner";

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isOwnerEmail(session.user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  const users = await listUsersForAdmin();
  return NextResponse.json({ users });
}

const patchSchema = z.object({
  userId: z.string(),
  plan: z.enum(["free", "pro"]).optional(),
});

export async function PATCH(req: Request) {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  try {
    const body = patchSchema.parse(await req.json());
    if (body.plan) {
      const user = await setUserPlan(body.userId, body.plan);
      return NextResponse.json({ user });
    }
    const user = await findUserById(body.userId);
    return NextResponse.json({
      user: user ? toPublicUser(user) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const deleteSchema = z.object({
  userId: z.string(),
});

export async function DELETE(req: Request) {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  try {
    const body = deleteSchema.parse(await req.json());
    const result = await deleteUserAccount(
      body.userId,
      gate.session!.user!.id!,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
