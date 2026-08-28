import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { comparePassword, signToken } from "@/lib/auth";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "login"), 10, 15 * 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || !password || password.length > 256) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !await comparePassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (!user.active || !user.verified) {
      return NextResponse.json({ error: "This account is not active. Please complete activation or contact the practice." }, { status: 403 });
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName } });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
