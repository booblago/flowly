import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProCheckoutSession } from "@/lib/billing";
import { getUserPlan } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plan = await getUserPlan(session.user.id);
  return NextResponse.json({
    plan,
    limits: PLAN_LIMITS[plan],
    stripeConfigured: isStripeConfigured(),
  });
}

/** Start Stripe Checkout for Pro (replaces free mock upgrade). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local (see README).",
        code: "STRIPE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  try {
    const checkout = await createProCheckoutSession(session.user.id);
    return NextResponse.json({
      ...checkout,
      message: "Redirect to Stripe Checkout",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
