import Stripe from "stripe";

let stripe: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_SECRET_KEY.startsWith("sk_"),
  );
}

export function getStripe() {
  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local",
    );
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}

export function appUrl() {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Prefer a Price ID from Dashboard; otherwise Checkout uses inline price_data. */
export function stripePriceId() {
  return process.env.STRIPE_PRICE_ID || null;
}

export const PRO_AMOUNT_CENTS = 1200;
export const PRO_CURRENCY = "usd";
