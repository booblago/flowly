import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { findUserById, toPublicUser, updateUserProfile } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await findUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ user: toPublicUser(user) });
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(280).optional(),
  company: z.string().max(120).optional(),
  avatarColor: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = patchSchema.parse(await req.json());
    if (body.avatarUrl && body.avatarUrl.length > 900_000) {
      return NextResponse.json(
        { error: "Image too large (max ~650KB)" },
        { status: 400 },
      );
    }
    const user = await updateUserProfile(session.user.id, body);
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
