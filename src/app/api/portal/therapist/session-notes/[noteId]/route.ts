import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessionNotes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { getCurrentAssignedClient } from "@/lib/private-care";

const MAX_NOTE_LENGTH = Math.max(1, Number(process.env.MAX_SESSION_NOTE_LENGTH || "12000"));

export async function PUT(req: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { noteId } = await params;
  const [note] = await db.select().from(sessionNotes).where(eq(sessionNotes.id, noteId)).limit(1);
  if (!note) return NextResponse.json({ error: "Session note not found" }, { status: 404 });
  const relationship = await getCurrentAssignedClient(user!.id, note.clientId);
  if (!relationship || note.therapistId !== relationship.therapist.id) return NextResponse.json({ error: "Session note not found or unauthorized" }, { status: 403 });

  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Session note content is required." }, { status: 400 });
  if (content.length > MAX_NOTE_LENGTH) return NextResponse.json({ error: `Session note is too long. Maximum length is ${MAX_NOTE_LENGTH} characters.` }, { status: 400 });
  const [updated] = await db.update(sessionNotes).set({ content, updatedAt: new Date() }).where(and(
    eq(sessionNotes.id, noteId),
    eq(sessionNotes.therapistId, relationship.therapist.id),
  )).returning();
  return NextResponse.json({ note: updated });
}
