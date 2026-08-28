import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { therapists, users, clients } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const rows = await db.execute(sql`
    SELECT t.id, t.bio, t.specialty, t.active, t.created_at as "createdAt",
      u.full_name as "fullName", u.email, u.phone,
      (SELECT count(*) FROM clients c WHERE c.therapist_id = t.id) as "clientCount"
    FROM therapists t INNER JOIN users u ON t.user_id = u.id ORDER BY u.full_name
  `);
  return NextResponse.json({ therapists: rows.rows });
}
