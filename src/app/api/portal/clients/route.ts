import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { clients, users } from "@/db/schema";
import { requireAuth, getTherapistRecord } from "@/lib/auth-utils";
import { eq, sql } from "drizzle-orm";

function getPaging(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  return { page, limit, offset: (page - 1) * limit };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";

  if (user!.role === "therapist") {
    const therapist = await getTherapistRecord(user!.id);
    if (!therapist) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    const { page, limit, offset } = getPaging(searchParams);
    const values: unknown[] = [therapist.id];
    let searchWhere = "";
    if (search) {
      values.push(`%${search}%`);
      searchWhere = `AND (u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(u.phone, '') ILIKE $${values.length})`;
    }
    const count = await pool.query(`SELECT count(*) FROM clients c INNER JOIN users u ON c.user_id=u.id WHERE c.therapist_id=$1 ${searchWhere}`, values);
    const senderIndex = values.length + 1;
    values.push(user!.id);
    const limitIndex = values.length + 1;
    values.push(limit);
    const offsetIndex = values.length + 1;
    values.push(offset);
    const rows = await pool.query(
      `SELECT c.id, c.user_id AS "userId", c.created_at AS "createdAt", u.full_name AS "fullName", u.email, u.phone, u.active, u.verified,
        (SELECT count(*) FROM appointments a WHERE a.client_id=c.id AND a.therapist_id=$1) AS "appointmentCount",
        (SELECT a.date FROM appointments a WHERE a.client_id=c.id AND a.therapist_id=$1 AND a.date >= to_char(now() AT TIME ZONE 'Africa/Nairobi','YYYY-MM-DD') AND a.status IN ('pending','confirmed','rescheduled') ORDER BY a.date,a.start_time LIMIT 1) AS "nextAppointmentDate",
        (SELECT a.start_time FROM appointments a WHERE a.client_id=c.id AND a.therapist_id=$1 AND a.date >= to_char(now() AT TIME ZONE 'Africa/Nairobi','YYYY-MM-DD') AND a.status IN ('pending','confirmed','rescheduled') ORDER BY a.date,a.start_time LIMIT 1) AS "nextAppointmentTime",
        (SELECT a.date FROM appointments a WHERE a.client_id=c.id AND a.therapist_id=$1 AND a.status IN ('completed','no-show','cancelled') ORDER BY a.date DESC,a.start_time DESC LIMIT 1) AS "lastAppointmentDate",
        (SELECT count(*) FROM messages m INNER JOIN conversations cv ON m.conversation_id=cv.id WHERE cv.client_id=c.id AND cv.therapist_id=$1 AND m.read=false AND m.sender_id<>$${senderIndex}) AS "unreadMessages"
       FROM clients c INNER JOIN users u ON c.user_id=u.id
       WHERE c.therapist_id=$1 ${searchWhere}
       ORDER BY u.full_name ASC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      values,
    );
    return NextResponse.json({ clients: rows.rows, page, limit, total: Number(count.rows[0]?.count || 0) });
  }

  if (user!.role === "admin") {
    const rows = await db.execute(sql`
      SELECT c.id, c.notes, c.created_at as "createdAt", u.full_name as "fullName", u.email, u.phone,
        tu.full_name as "therapistName", t.id as "therapistId"
      FROM clients c
      INNER JOIN users u ON c.user_id = u.id
      INNER JOIN therapists t ON c.therapist_id = t.id
      INNER JOIN users tu ON t.user_id = tu.id
      ${search ? sql`WHERE u.full_name ILIKE ${"%" + search + "%"} OR u.email ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY u.full_name
    `);
    return NextResponse.json({ clients: rows.rows });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
