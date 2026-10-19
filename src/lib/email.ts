import { appUrl } from "@/lib/stripe";

/** Normalize + basic sanity checks (not just HTML5 type=email). */
export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string) {
  const email = normalizeEmail(raw);
  if (email.length < 5 || email.length > 254) return false;
  // Simple RFC-ish check — rejects spaces / missing domain
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  if (email.includes("..")) return false;
  return true;
}

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  token: string;
}) {
  const verifyUrl = `${appUrl()}/verify-email?token=${encodeURIComponent(opts.token)}`;
  const subject = "Verify your Flowly email";
  const text = `Hi ${opts.name},\n\nConfirm your email to activate Flowly:\n${verifyUrl}\n\nLink expires in 24 hours.\n`;

  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "Flowly <onboarding@resend.dev>";

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Email send failed: ${body}`);
    }
    return { sent: true as const, verifyUrl };
  }

  // No Resend key — still return the link so UI can show it (demo / sandbox).
  console.info("[email] RESEND_API_KEY missing — verification link:", verifyUrl);
  return { sent: false as const, verifyUrl };
}
