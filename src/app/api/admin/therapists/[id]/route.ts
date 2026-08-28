import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { therapists, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id } = await params;
  const profile = await pool.query(
    `SELECT t.id, t.bio, t.professional_title AS "professionalTitle", t.specialty, t.active, t.created_at AS "createdAt", u.id AS "userId", u.full_name AS "fullName", u.email, u.phone, u.verified,
       (SELECT count(*) FROM clients c WHERE c.therapist_id=t.id) AS "clientCount"
     FROM therapists t INNER JOIN users u ON t.user_id=u.id WHERE t.id=$1`, [id]
  );
  if (!profile.rows[0]) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
  const [clients, upcoming] = await Promise.all([
    pool.query(`SELECT c.id, u.full_name AS "fullName", u.email, u.active FROM clients c INNER JOIN users u ON c.user_id=u.id WHERE c.therapist_id=$1 ORDER BY u.full_name LIMIT 50`, [id]),
    pool.query(`SELECT a.id,a.date,a.start_time AS "startTime",a.end_time AS "endTime",a.status,s.name AS "serviceName",u.full_name AS "clientName" FROM appointments a LEFT JOIN services s ON a.service_id=s.id LEFT JOIN clients c ON a.client_id=c.id LEFT JOIN users u ON c.user_id=u.id WHERE a.therapist_id=$1 AND a.date>=to_char(now() AT TIME ZONE 'Africa/Nairobi','YYYY-MM-DD') AND a.status IN ('pending','confirmed','rescheduled') ORDER BY a.date,a.start_time LIMIT 20`, [id]),
  ]);
  return NextResponse.json({ therapist: profile.rows[0], clients: clients.rows, upcomingAppointments: upcoming.rows });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id } = await params;
  const body = await req.json();
  const [existing] = await db.select().from(therapists).where(eq(therapists.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
  const fullName = body.fullName ? String(body.fullName).trim() : undefined;
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
  const phone = body.phone === undefined ? undefined : (body.phone ? String(body.phone).trim() : null);
  const bio = body.bio === undefined ? undefined : (body.bio ? String(body.bio).trim() : null);
  const professionalTitle = body.professionalTitle === undefined ? undefined : (body.professionalTitle ? String(body.professionalTitle).trim() : null);
  const specialty = body.specialty === undefined ? undefined : (body.specialty ? String(body.specialty).trim() : null);
  const active = typeof body.active === "boolean" ? body.active : undefined;

  const [account] = await db.select({ verified: users.verified }).from(users).where(eq(users.id, existing.userId)).limit(1);
  if (active === true && !account?.verified) return NextResponse.json({ error: "This account must be activated through its invitation before it can be made active." }, { status: 400 });
  if (email) {
    const duplicate = await pool.query("SELECT id FROM users WHERE email=$1 AND id<>$2", [email, existing.userId]);
    if (duplicate.rows[0]) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");
    const userSets: string[] = []; const userValues: unknown[] = [];
    const addUser = (column: string, value: unknown) => { userValues.push(value); userSets.push(`${column}=$${userValues.length}`); };
    if (fullName !== undefined) addUser("full_name", fullName);
    if (email !== undefined) addUser("email", email);
    if (phone !== undefined) addUser("phone", phone);
    if (active !== undefined) addUser("active", active);
    if (userSets.length) { userValues.push(existing.userId); await pgClient.query(`UPDATE users SET ${userSets.join(", ")} WHERE id=$${userValues.length}`, userValues); }
    const therapistSets: string[] = []; const therapistValues: unknown[] = [];
    const addTherapist = (column: string, value: unknown) => { therapistValues.push(value); therapistSets.push(`${column}=$${therapistValues.length}`); };
    if (bio !== undefined) addTherapist("bio", bio);
    if (professionalTitle !== undefined) addTherapist("professional_title", professionalTitle);
    if (specialty !== undefined) addTherapist("specialty", specialty);
    if (active !== undefined) addTherapist("active", active);
    if (therapistSets.length) { therapistValues.push(id); await pgClient.query(`UPDATE therapists SET ${therapistSets.join(", ")} WHERE id=$${therapistValues.length}`, therapistValues); }
    await pgClient.query("COMMIT");
    await writeAuditLog({ actorUserId: user!.id, action: active === false ? "therapist.deactivated" : "therapist.updated", entityType: "therapist", entityId: id, metadata: { active, emailChanged: Boolean(email) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await pgClient.query("ROLLBACK").catch(() => {});
    console.error("Admin update therapist failed", e);
    return NextResponse.json({ error: "Unable to update therapist." }, { status: 500 });
  } finally { pgClient.release(); }
}
