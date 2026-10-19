import type Stripe from "stripe";
import {
  findUserById,
  findUserByStripeCustomerId,
  setUserStripeBilling,
} from "@/lib/db";
import {
  PRO_AMOUNT_CENTS,
  PRO_CURRENCY,
  appUrl,
  getStripe,
  stripePriceId,
} from "@/lib/stripe";

async function ensureCustomer(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  const stripe = getStripe();

  if (user.stripeCustomerId) {
    return { user, customerId: user.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { flowlyUserId: user.id },
  });

  await setUserStripeBilling(user.id, { stripeCustomerId: customer.id });
  return { user, customerId: customer.id };
}

export async function createProCheckoutSession(userId: string) {
  const { user, customerId } = await ensureCustomer(userId);
  if (user.plan === "pro" && user.stripeSubscriptionStatus === "active") {
    throw new Error("Already on Flowly Pro");
  }

  const stripe = getStripe();
  const priceId = stripePriceId();
  const base = appUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${base}/account?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/account?billing=cancel`,
    allow_promotion_codes: true,
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            price_data: {
              currency: PRO_CURRENCY,
              unit_amount: PRO_AMOUNT_CENTS,
              recurring: { interval: "month" },
              product_data: {
                name: "Flowly Pro",
                description:
                  "Unlimited boards & automations, SLA packs, recurring cards, client reports",
              },
            },
            quantity: 1,
          },
    ],
    subscription_data: {
      metadata: { flowlyUserId: user.id },
    },
    metadata: { flowlyUserId: user.id },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

export async function createBillingPortalSession(userId: string) {
  const { customerId } = await ensureCustomer(userId);
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/account`,
  });
  return { url: session.url };
}

export async function confirmCheckoutSession(sessionId: string, userId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const boundId =
    session.client_reference_id || session.metadata?.flowlyUserId || null;
  if (!boundId || boundId !== userId) {
    throw new Error("Checkout session does not belong to this user");
  }
  if (session.status !== "complete" && session.payment_status !== "paid") {
    throw new Error("Checkout not completed yet");
  }

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  await setUserStripeBilling(userId, {
    plan: "pro",
    stripeCustomerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
    stripeSubscriptionId: subscription?.id ?? null,
    stripeSubscriptionStatus: subscription?.status ?? "active",
  });

  return findUserById(userId);
}

function activeStatuses() {
  return new Set(["active", "trialing"]);
}

export async function applySubscriptionToUser(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let user =
    (await findUserByStripeCustomerId(customerId)) ||
    (fallbackUserId ? await findUserById(fallbackUserId) : null) ||
    (subscription.metadata?.flowlyUserId
      ? await findUserById(subscription.metadata.flowlyUserId)
      : null);

  if (!user) return null;

  const isActive = activeStatuses().has(subscription.status);
  await setUserStripeBilling(user.id, {
    plan: isActive ? "pro" : "free",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
  });
  return user.id;
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;
      const userId = session.client_reference_id || session.metadata?.flowlyUserId;
      if (!userId || !session.subscription) break;
      const stripe = getStripe();
      const sub =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
      await applySubscriptionToUser(sub, userId);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await applySubscriptionToUser(
        subscription,
        subscription.metadata?.flowlyUserId,
      );
      break;
    }
    default:
      break;
  }
}
