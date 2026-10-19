import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { completeCard, uncompleteCard } from "@/lib/db";

const schema = z.object({
  cardId: z.string(),
  complete: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    const card = body.complete
      ? await completeCard(body.cardId, session.user.id)
      : await uncompleteCard(body.cardId, session.user.id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
