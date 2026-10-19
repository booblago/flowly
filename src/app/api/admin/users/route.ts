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
    const target = await findUserById(body.userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (isOwnerEmail(target.email) && body.plan === "free") {
      return NextResponse.json(
        { error: "Cannot demote an owner account" },
        { status: 400 },
      );
    }
    if (body.plan) {
      const user = await setUserPlan(body.userId, body.plan);
      return NextResponse.json({ user });
    }
    return NextResponse.json({
      user: toPublicUser(target),
    });
  } catch (error) {
    console.error("[admin/users PATCH]", error);
    return NextResponse.json({ error: "Request failed" }, { status: 400 });
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
    const target = await findUserById(body.userId);
    if (target && isOwnerEmail(target.email)) {
      return NextResponse.json(
        { error: "Cannot delete an owner account" },
        { status: 400 },
      );
    }
    const result = await deleteUserAccount(
      body.userId,
      gate.session!.user!.id!,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (message.includes("cannot delete your own")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[admin/users DELETE]", error);
    return NextResponse.json({ error: "Request failed" }, { status: 400 });
  }
}
