import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTherapistRecord } from "@/lib/auth-utils";
import { db } from "@/db";
import { timeoff } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { getNairobiToday, parseDateOnly } from "@/lib/practice-time";

export async function GET() {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const today = getNairobiToday();
  const rows = await db.select().from(timeoff)
    .where(and(eq(timeoff.therapistId, therapist.id), gte(timeoff.date, today)))
    .orderBy(timeoff.date, timeoff.startTime);
  return NextResponse.json({ timeoff: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { date, startTime, endTime, reason } = await req.json();
  if (!date || !startTime || !endTime) return NextResponse.json({ error: "date, startTime, endTime required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
    return NextResponse.json({ error: "Invalid unavailable period" }, { status: 400 });
  }
  try { parseDateOnly(date); } catch { return NextResponse.json({ error: "Invalid unavailable date" }, { status: 400 }); }
  const [row] = await db.insert(timeoff).values({
    therapistId: therapist.id, date, startTime, endTime, reason: reason || null,
  }).returning();
  return NextResponse.json({ timeoff: row });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await req.json();
  const [existing] = await db.select().from(timeoff).where(and(eq(timeoff.id, id), eq(timeoff.therapistId, therapist.id))).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  await db.delete(timeoff).where(eq(timeoff.id, id));
  return NextResponse.json({ ok: true });
}
