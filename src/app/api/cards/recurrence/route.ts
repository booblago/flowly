import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { processRecurringCards, setCardRecurrence } from "@/lib/db";

const schema = z.object({
  cardId: z.string(),
  recurrence: z.enum(["daily", "weekly", "monthly"]).nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  if (json?.process === true) {
    try {
      const result = await processRecurringCards(session.user.id);
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }
  try {
    const body = schema.parse(json);
    const card = await setCardRecurrence(
      body.cardId,
      session.user.id,
      body.recurrence,
    );
    if (!card) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
