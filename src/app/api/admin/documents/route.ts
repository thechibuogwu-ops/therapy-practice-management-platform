import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const category = searchParams.get("category") || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const values: unknown[] = []; const filters: string[] = [];
  if (search) { values.push(`%${search}%`); filters.push(`(d.file_name ILIKE $${values.length} OR cu.full_name ILIKE $${values.length})`); }
  if (category) { values.push(category); filters.push(`d.category = $${values.length}`); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const count = await pool.query(`SELECT count(*) FROM documents d INNER JOIN clients c ON d.client_id=c.id INNER JOIN users cu ON c.user_id=cu.id ${where}`, values);
  values.push(limit, offset);
  const rows = await pool.query(
    `SELECT d.id,d.file_name AS "fileName",d.file_size AS "fileSize",d.mime_type AS "mimeType",d.category,d.created_at AS "createdAt",cu.full_name AS "clientName",tu.full_name AS "therapistName",uu.full_name AS "uploadedByName"
     FROM documents d INNER JOIN clients c ON d.client_id=c.id INNER JOIN users cu ON c.user_id=cu.id
     LEFT JOIN therapists t ON d.therapist_id=t.id LEFT JOIN users tu ON t.user_id=tu.id LEFT JOIN users uu ON d.uploaded_by=uu.id
     ${where} ORDER BY d.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return NextResponse.json({ documents: rows.rows, page, limit, total: Number(count.rows[0]?.count || 0) });
}
