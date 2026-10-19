import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const limited = await rateLimit(`verify:${ip}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  try {
    const email = await verifyEmailToken(token);
    return NextResponse.json({ ok: true, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
