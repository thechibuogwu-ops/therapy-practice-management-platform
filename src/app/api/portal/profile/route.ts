import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  const body = await req.json();
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  const phone = body.phone === undefined ? undefined : (typeof body.phone === "string" ? body.phone.trim() : null);
  if (fullName !== undefined && (!fullName || fullName.length > 120)) return NextResponse.json({ error: "Name must be between 1 and 120 characters." }, { status: 400 });
  if (phone !== undefined && phone !== null && phone.length > 30) return NextResponse.json({ error: "Phone number is too long." }, { status: 400 });
  if (fullName === undefined && phone === undefined) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const [updated] = await db.update(users).set({ ...(fullName !== undefined ? { fullName } : {}), ...(phone !== undefined ? { phone } : {}) }).where(eq(users.id, user!.id)).returning();
  return NextResponse.json({ user: { id: updated.id, fullName: updated.fullName, email: updated.email, phone: updated.phone } });
}
