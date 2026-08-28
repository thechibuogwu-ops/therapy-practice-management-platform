import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { db } from "@/db";
import { clients, conversations, therapists, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { writeAuditLog } from "@/lib/audit";
import { createInvitationInTransaction, createUnusablePasswordHash, getInvitationPresentation } from "@/lib/invitations";

function pageParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  return { page, limit, offset: (page - 1) * limit };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const therapistId = searchParams.get("therapistId") || "";
  const active = searchParams.get("active");
  const { page, limit, offset } = pageParams(searchParams);

  const filters: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => { values.push(value); filters.push(sql.replace("?", `$${values.length}`)); };
  if (search) {
    values.push(`%${search}%`);
    filters.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(u.phone, '') ILIKE $${values.length})`);
  }
  if (therapistId) add("c.therapist_id = ?", therapistId);
  if (active === "true" || active === "false") add("u.active = ?", active === "true");
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const countResult = await pool.query(`SELECT count(*) FROM clients c INNER JOIN users u ON c.user_id=u.id ${where}`, values);
  values.push(limit, offset);
  const rows = await pool.query(
    `SELECT c.id, c.created_at AS "createdAt", c.notes,
       u.full_name AS "fullName", u.email, u.phone, u.active,
       t.id AS "therapistId", tu.full_name AS "therapistName", t.specialty AS "therapistSpecialty"
     FROM clients c
     INNER JOIN users u ON c.user_id = u.id
     INNER JOIN therapists t ON c.therapist_id = t.id
     INNER JOIN users tu ON t.user_id = tu.id
     ${where}
     ORDER BY u.full_name ASC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return NextResponse.json({ clients: rows.rows, page, limit, total: Number(countResult.rows[0]?.count || 0) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const therapistId = String(body.therapistId || "");

  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !therapistId) {
    return NextResponse.json({ error: "Name, valid email, and assigned therapist are required." }, { status: 400 });
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const [therapist] = await db.select().from(therapists).where(and(eq(therapists.id, therapistId), eq(therapists.active, true))).limit(1);
  if (!therapist) return NextResponse.json({ error: "Assigned therapist is not active." }, { status: 400 });

  const passwordHash = await createUnusablePasswordHash();
  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");
    const newUser = await pgClient.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, active, verified)
       VALUES ($1, $2, 'client', $3, $4, $5, false) RETURNING id, email, full_name, phone, active`,
       [email, passwordHash, fullName, phone, false]
    );
    const newClient = await pgClient.query(
      `INSERT INTO clients (user_id, therapist_id) VALUES ($1, $2) RETURNING id, therapist_id`,
      [newUser.rows[0].id, therapistId]
    );
    await pgClient.query(
      `INSERT INTO conversations (client_id, therapist_id) VALUES ($1, $2)`,
      [newClient.rows[0].id, therapistId]
    );
    const invitation = await createInvitationInTransaction(pgClient, { userId: newUser.rows[0].id, invitedBy: user!.id });
    await pgClient.query("COMMIT");
    await writeAuditLog({ actorUserId: user!.id, action: "client.created", entityType: "client", entityId: newClient.rows[0].id, metadata: { email, therapistId, activationRequired: true } });
    await writeAuditLog({ actorUserId: user!.id, action: "invitation.created", entityType: "user", entityId: newUser.rows[0].id, metadata: { role: "client" } });
    return NextResponse.json({
      client: { id: newClient.rows[0].id, user: newUser.rows[0], therapistId },
      invitation: getInvitationPresentation(invitation.rawToken, invitation.expiresAt),
    }, { status: 201 });
  } catch (e: any) {
    await pgClient.query("ROLLBACK").catch(() => {});
    if (e?.code === "23505") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    console.error("Admin create client failed", e);
    return NextResponse.json({ error: "Unable to create client." }, { status: 500 });
  } finally {
    pgClient.release();
  }
}
