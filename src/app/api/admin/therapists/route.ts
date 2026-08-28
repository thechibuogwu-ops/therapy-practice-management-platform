import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { therapists, users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  const active = searchParams.get("active");
  const { page, limit, offset } = pageParams(searchParams);
  const filters: string[] = []; const values: unknown[] = [];
  if (search) { values.push(`%${search}%`); filters.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(t.specialty,'') ILIKE $${values.length})`); }
  if (active === "true" || active === "false") { values.push(active === "true"); filters.push(`t.active = $${values.length}`); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const count = await pool.query(`SELECT count(*) FROM therapists t INNER JOIN users u ON t.user_id=u.id ${where}`, values);
  values.push(limit, offset);
  const rows = await pool.query(
    `SELECT t.id, t.bio, t.professional_title AS "professionalTitle", t.specialty, t.active, t.created_at AS "createdAt",
       u.full_name AS "fullName", u.email, u.phone,
       (SELECT count(*) FROM clients c WHERE c.therapist_id=t.id) AS "clientCount",
       (SELECT count(*) FROM appointments a WHERE a.therapist_id=t.id AND a.date >= to_char(now() AT TIME ZONE 'Africa/Nairobi','YYYY-MM-DD') AND a.status IN ('pending','confirmed','rescheduled')) AS "upcomingAppointments"
     FROM therapists t INNER JOIN users u ON t.user_id=u.id ${where}
     ORDER BY u.full_name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return NextResponse.json({ therapists: rows.rows, page, limit, total: Number(count.rows[0]?.count || 0) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const professionalTitle = body.professionalTitle ? String(body.professionalTitle).trim() : null;
  const specialty = body.specialty ? String(body.specialty).trim() : null;
  const bio = body.bio ? String(body.bio).trim() : null;
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });
  }
  const [duplicate] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (duplicate) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const passwordHash = await createUnusablePasswordHash();
  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");
    const newUser = await pgClient.query(`INSERT INTO users (email,password_hash,role,full_name,phone,active,verified) VALUES ($1,$2,'therapist',$3,$4,false,false) RETURNING id, email, full_name`, [email, passwordHash, fullName, phone]);
    const newTherapist = await pgClient.query(`INSERT INTO therapists (user_id,bio,professional_title,specialty,active) VALUES ($1,$2,$3,$4,false) RETURNING id`, [newUser.rows[0].id, bio, professionalTitle, specialty]);
    const invitation = await createInvitationInTransaction(pgClient, { userId: newUser.rows[0].id, invitedBy: user!.id });
    await pgClient.query("COMMIT");
    await writeAuditLog({ actorUserId: user!.id, action: "therapist.created", entityType: "therapist", entityId: newTherapist.rows[0].id, metadata: { email, activationRequired: true } });
    await writeAuditLog({ actorUserId: user!.id, action: "invitation.created", entityType: "user", entityId: newUser.rows[0].id, metadata: { role: "therapist" } });
    return NextResponse.json({ therapist: { id: newTherapist.rows[0].id, userId: newUser.rows[0].id }, invitation: getInvitationPresentation(invitation.rawToken, invitation.expiresAt) }, { status: 201 });
  } catch (e: any) {
    await pgClient.query("ROLLBACK").catch(() => {});
    if (e?.code === "23505") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    console.error("Admin create therapist failed", e);
    return NextResponse.json({ error: "Unable to create therapist." }, { status: 500 });
  } finally { pgClient.release(); }
}
