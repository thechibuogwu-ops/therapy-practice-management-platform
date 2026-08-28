import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, sessionNotes } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { getCurrentAssignedClient } from "@/lib/private-care";

const MAX_NOTE_LENGTH = Math.max(1, Number(process.env.MAX_SESSION_NOTE_LENGTH || "12000"));

function paging(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  return { page, limit, offset: (page - 1) * limit };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id: clientId } = await params;
  const relationship = await getCurrentAssignedClient(user!.id, clientId);
  if (!relationship) return NextResponse.json({ error: "Client not found or unauthorized" }, { status: 403 });
  const { page, limit, offset } = paging(new URL(req.url).searchParams);
  const [notes, count] = await Promise.all([
    db.select({
      id: sessionNotes.id,
      appointmentId: sessionNotes.appointmentId,
      content: sessionNotes.content,
      createdAt: sessionNotes.createdAt,
      updatedAt: sessionNotes.updatedAt,
      appointmentDate: appointments.date,
      appointmentStartTime: appointments.startTime,
    }).from(sessionNotes)
      .leftJoin(appointments, eq(sessionNotes.appointmentId, appointments.id))
      .where(and(eq(sessionNotes.therapistId, relationship.therapist.id), eq(sessionNotes.clientId, clientId)))
      .orderBy(desc(sessionNotes.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(sessionNotes)
      .where(and(eq(sessionNotes.therapistId, relationship.therapist.id), eq(sessionNotes.clientId, clientId))),
  ]);
  return NextResponse.json({ notes, page, limit, total: Number(count[0]?.count || 0), maxLength: MAX_NOTE_LENGTH });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id: clientId } = await params;
  const relationship = await getCurrentAssignedClient(user!.id, clientId);
  if (!relationship) return NextResponse.json({ error: "Client not found or unauthorized" }, { status: 403 });

  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const appointmentId = typeof body.appointmentId === "string" && body.appointmentId ? body.appointmentId : null;
  if (!content) return NextResponse.json({ error: "Session note content is required." }, { status: 400 });
  if (content.length > MAX_NOTE_LENGTH) return NextResponse.json({ error: `Session note is too long. Maximum length is ${MAX_NOTE_LENGTH} characters.` }, { status: 400 });

  if (appointmentId) {
    const [appointment] = await db.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.id, appointmentId),
      eq(appointments.clientId, relationship.client.id),
      eq(appointments.therapistId, relationship.therapist.id),
    )).limit(1);
    if (!appointment) return NextResponse.json({ error: "Appointment not found or unauthorized for this client." }, { status: 403 });
  }

  const [note] = await db.insert(sessionNotes).values({
    clientId: relationship.client.id,
    therapistId: relationship.therapist.id,
    appointmentId,
    content,
  }).returning();
  return NextResponse.json({ note }, { status: 201 });
}
