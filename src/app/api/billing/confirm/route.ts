import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmCheckoutSession } from "@/lib/billing";
import { toPublicUser } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured.", code: "STRIPE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  try {
    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    const user = await confirmCheckoutSession(body.sessionId, session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: toPublicUser(user), plan: user.plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirm failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
