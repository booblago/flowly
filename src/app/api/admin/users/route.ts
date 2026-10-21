import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  deleteUserAccount,
  listUsersForAdmin,
  toPublicUser,
  findUserById,
  updateDb,
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
    if (!body.plan) {
      const target = await findUserById(body.userId);
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ user: toPublicUser(target) });
    }

    // Single DB round-trip: load → validate → mutate → save
    let result: ReturnType<typeof toPublicUser> | null = null;
    let fail: "not_found" | "owner" | null = null;
    await updateDb((db) => {
      const target = db.users.find((u) => u.id === body.userId);
      if (!target) {
        fail = "not_found";
        return;
      }
      if (isOwnerEmail(target.email) && body.plan === "free") {
        fail = "owner";
        return;
      }
      target.plan = body.plan!;
      result = toPublicUser(target);
    });

    if (fail === "not_found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (fail === "owner") {
      return NextResponse.json(
        { error: "Cannot demote an owner account" },
        { status: 400 },
      );
    }
    return NextResponse.json({ user: result });
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
