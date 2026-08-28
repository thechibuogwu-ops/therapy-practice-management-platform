import { db } from "@/db";
import { therapists, users, availability } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [row] = await db
      .select({
        id: therapists.id,
        fullName: users.fullName,
        bio: therapists.bio,
        specialty: therapists.specialty,
        active: therapists.active,
      })
      .from(therapists)
      .innerJoin(users, eq(therapists.userId, users.id))
      .where(eq(therapists.id, id))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });

    const avail = await db
      .select()
      .from(availability)
      .where(eq(availability.therapistId, id));

    return NextResponse.json({ therapist: row, availability: avail });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to load therapist" }, { status: 500 });
  }
}
