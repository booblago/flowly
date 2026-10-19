/**
 * Only these emails can open the owner admin (accounts CRUD).
 * Set OWNER_EMAIL in .env.local — no hardcoded fallback (avoids leaking PII in git).
 */
export function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAIL || process.env.OWNER_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email?: string | null) {
  if (!email) return false;
  const owners = ownerEmails();
  if (owners.length === 0) return false;
  return owners.includes(email.toLowerCase());
}

/** Password used to recreate the owner after ephemeral DB resets on Vercel. */
export function ownerBootstrapPassword() {
  return (process.env.OWNER_PASSWORD || "").trim() || null;
}

/** Require inbox verification only when Resend is configured. */
export function emailVerificationRequired() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
