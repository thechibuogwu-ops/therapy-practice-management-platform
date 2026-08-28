import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const therapistId = searchParams.get("therapistId") || "";
  const clientId = searchParams.get("clientId") || "";
  const status = searchParams.get("status") || "";
  const paymentStatus = searchParams.get("paymentStatus") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const values: unknown[] = []; const filters: string[] = [];
  const add = (fragment: string, value: unknown) => { values.push(value); filters.push(fragment.replace("?", `$${values.length}`)); };
  if (search) { values.push(`%${search}%`); filters.push(`(cu.full_name ILIKE $${values.length} OR tu.full_name ILIKE $${values.length})`); }
  if (therapistId) add("a.therapist_id = ?", therapistId);
  if (clientId) add("a.client_id = ?", clientId);
  if (status) add("a.status = ?", status);
  if (paymentStatus) add("a.payment_status = ?", paymentStatus);
  if (from) add("a.date >= ?", from);
  if (to) add("a.date <= ?", to);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const count = await pool.query(`SELECT count(*) FROM appointments a INNER JOIN clients c ON a.client_id=c.id INNER JOIN users cu ON c.user_id=cu.id INNER JOIN therapists t ON a.therapist_id=t.id INNER JOIN users tu ON t.user_id=tu.id ${where}`, values);
  values.push(limit, offset);
  const rows = await pool.query(
    `SELECT a.id,a.date,a.start_time AS "startTime",a.end_time AS "endTime",a.status,a.payment_status AS "paymentStatus",a.meeting_link AS "meetingLink",a.notes,
      s.name AS "serviceName",s.price_kes AS "servicePrice",c.id AS "clientId",t.id AS "therapistId",cu.full_name AS "clientName",tu.full_name AS "therapistName"
     FROM appointments a
     INNER JOIN clients c ON a.client_id=c.id INNER JOIN users cu ON c.user_id=cu.id
     INNER JOIN therapists t ON a.therapist_id=t.id INNER JOIN users tu ON t.user_id=tu.id
     LEFT JOIN services s ON a.service_id=s.id ${where}
     ORDER BY a.date DESC,a.start_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return NextResponse.json({ appointments: rows.rows, page, limit, total: Number(count.rows[0]?.count || 0) });
}
