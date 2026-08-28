import { db } from "@/db";
import { therapists, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: therapists.id,
        fullName: users.fullName,
        bio: therapists.bio,
        specialty: therapists.specialty,
        active: therapists.active,
      })
      .from(therapists)
      .innerJoin(users, eq(therapists.userId, users.id))
      .where(eq(therapists.active, true));
    return NextResponse.json({ therapists: rows });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to load therapists" }, { status: 500 });
  }
}
