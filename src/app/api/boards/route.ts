import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createBoard,
  ensureSessionUser,
  getBoardsForUser,
  getWorkspacesForUser,
} from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSessionUser({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });
  const boards = await getBoardsForUser(session.user.id);
  return NextResponse.json({ boards });
}

const createSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  template: z.enum(["delivery", "support", "content"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const limited = await rateLimit(
      `boards-create:${session.user.id}:${clientIp(req)}`,
      20,
      60 * 60 * 1000,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many boards created. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }
    // On Vercel memory DB, never trust a workspaceId from another serverless
    // instance — always ensure this request's user + workspace locally.
    await ensureSessionUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    const workspaces = await getWorkspacesForUser(session.user.id);
    const workspaceId = workspaces[0]?.id;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace missing" },
        { status: 400 },
      );
    }
    const body = createSchema.parse(await req.json());
    const board = await createBoard({
      workspaceId,
      name: body.name,
      description: body.description,
      template: body.template,
      userId: session.user.id,
    });
    return NextResponse.json({ board });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
