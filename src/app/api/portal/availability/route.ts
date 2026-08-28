import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTherapistRecord } from "@/lib/auth-utils";
import { db } from "@/db";
import { availability } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(availability).where(eq(availability.therapistId, therapist.id)).orderBy(availability.dayOfWeek);
  return NextResponse.json({ availability: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { dayOfWeek, startTime, endTime } = await req.json();
  if (dayOfWeek == null || !startTime || !endTime) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
    return NextResponse.json({ error: "Invalid availability period" }, { status: 400 });
  }
  const [row] = await db.insert(availability).values({ therapistId: therapist.id, dayOfWeek, startTime, endTime }).returning();
  return NextResponse.json({ availability: row });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await req.json();
  // Verify ownership
  const [existing] = await db.select().from(availability).where(and(eq(availability.id, id), eq(availability.therapistId, therapist.id))).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  await db.delete(availability).where(eq(availability.id, id));
  return NextResponse.json({ ok: true });
}
