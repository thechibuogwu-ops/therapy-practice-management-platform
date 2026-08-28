import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const values: unknown[] = []; const filters: string[] = [];
  const add = (fragment: string, value: unknown) => { values.push(value); filters.push(fragment.replace("?", `$${values.length}`)); };
  if (search) { values.push(`%${search}%`); filters.push(`(u.full_name ILIKE $${values.length} OR p.transaction_ref ILIKE $${values.length})`); }
  if (status) add("p.status = ?", status);
  if (from) add("p.created_at >= ?", `${from} 00:00:00`);
  if (to) add("p.created_at <= ?", `${to} 23:59:59`);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const count = await pool.query(`SELECT count(*) FROM payments p INNER JOIN clients c ON p.client_id=c.id INNER JOIN users u ON c.user_id=u.id ${where}`, values);
  values.push(limit, offset);
  const rows = await pool.query(
    `SELECT p.id,p.amount_kes AS "amountKES",p.currency,p.provider,p.method,p.status,p.transaction_ref AS "transactionRef",p.created_at AS "createdAt",u.full_name AS "clientName",a.date AS "appointmentDate",s.name AS "serviceName"
     FROM payments p INNER JOIN clients c ON p.client_id=c.id INNER JOIN users u ON c.user_id=u.id LEFT JOIN appointments a ON p.appointment_id=a.id LEFT JOIN services s ON a.service_id=s.id
     ${where} ORDER BY p.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return NextResponse.json({ payments: rows.rows, page, limit, total: Number(count.rows[0]?.count || 0) });
}
