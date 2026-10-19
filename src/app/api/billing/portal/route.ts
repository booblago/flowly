import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe is not configured.",
        code: "STRIPE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  try {
    const portal = await createBillingPortalSession(session.user.id);
    return NextResponse.json(portal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
