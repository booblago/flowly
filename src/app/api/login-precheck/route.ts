import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, isEmailVerified, verifyPassword } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipLimit = rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${ipLimit.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = schema.parse(await req.json());
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const emailLimit = rateLimit(`login-email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Try again in ${emailLimit.retryAfterSec}s.`,
        },
        { status: 429 },
      );
    }

    const user = await findUserByEmail(email);
    // Opaque failure — do not reveal whether the email exists.
    if (!user || !(await verifyPassword(user, body.password))) {
      return NextResponse.json({ error: "INVALID" }, { status: 401 });
    }
    if (!isEmailVerified(user)) {
      return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }
}
