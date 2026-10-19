import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProCheckoutSession } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY (and optionally STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET) to .env.local",
        code: "STRIPE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  try {
    const checkout = await createProCheckoutSession(session.user.id);
    return NextResponse.json(checkout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
