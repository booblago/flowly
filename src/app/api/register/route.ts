import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/lib/db";
import { isValidEmail, normalizeEmail, sendVerificationEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().min(5).max(254),
  password: z.string().min(6).max(128),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many signups. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = schema.parse(await req.json());
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const emailLimited = rateLimit(`register-email:${email}`, 3, 60 * 60 * 1000);
    if (!emailLimited.ok) {
      return NextResponse.json(
        { error: `Too many attempts for this email. Try again in ${emailLimited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const { user, verifyToken, needsVerification } = await createUser({
      name: body.name.trim(),
      email,
      password: body.password,
    });

    if (!needsVerification) {
      return NextResponse.json({
        user,
        needsVerification: false,
        emailSent: false,
      });
    }

    const mail = await sendVerificationEmail({
      to: email,
      name: user.name,
      token: verifyToken,
    });

    return NextResponse.json({
      user,
      needsVerification: true,
      emailSent: mail.sent,
      // Shown in UI when Resend is not configured (sandbox / demo).
      verifyUrl: mail.sent ? undefined : mail.verifyUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
