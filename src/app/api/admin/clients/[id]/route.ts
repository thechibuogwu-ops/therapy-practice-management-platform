import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { clients, conversations, therapists, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id } = await params;
  const result = await pool.query(
    `SELECT c.id, c.created_at AS "createdAt", c.notes, c.therapist_id AS "therapistId",
       u.id AS "userId", u.full_name AS "fullName", u.email, u.phone, u.active, u.verified,
       tu.full_name AS "therapistName", t.specialty AS "therapistSpecialty"
     FROM clients c
     INNER JOIN users u ON c.user_id = u.id
     INNER JOIN therapists t ON c.therapist_id = t.id
     INNER JOIN users tu ON t.user_id = tu.id
     WHERE c.id = $1`, [id]
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const [appointments, payments, documents] = await Promise.all([
    pool.query(`SELECT a.id, a.date, a.start_time AS "startTime", a.end_time AS "endTime", a.status, a.payment_status AS "paymentStatus", s.name AS "serviceName", tu.full_name AS "therapistName" FROM appointments a LEFT JOIN services s ON a.service_id=s.id LEFT JOIN therapists t ON a.therapist_id=t.id LEFT JOIN users tu ON t.user_id=tu.id WHERE a.client_id=$1 ORDER BY a.date DESC, a.start_time DESC LIMIT 50`, [id]),
    pool.query(`SELECT p.id, p.amount_kes AS "amountKES", p.currency, p.provider, p.method, p.status, p.transaction_ref AS "transactionRef", p.created_at AS "createdAt" FROM payments p WHERE p.client_id=$1 ORDER BY p.created_at DESC LIMIT 50`, [id]),
    pool.query(`SELECT d.id, d.file_name AS "fileName", d.file_size AS "fileSize", d.mime_type AS "mimeType", d.category, d.created_at AS "createdAt", u.full_name AS "uploadedByName" FROM documents d LEFT JOIN users u ON d.uploaded_by=u.id WHERE d.client_id=$1 ORDER BY d.created_at DESC LIMIT 50`, [id]),
  ]);
  return NextResponse.json({ client: result.rows[0], appointments: appointments.rows, payments: payments.rows, documents: documents.rows });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id } = await params;
  const body = await req.json();
  const fullName = body.fullName ? String(body.fullName).trim() : undefined;
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
  const phone = body.phone === undefined ? undefined : (body.phone ? String(body.phone).trim() : null);
  const active = typeof body.active === "boolean" ? body.active : undefined;
  const therapistId = body.therapistId ? String(body.therapistId) : undefined;

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const [account] = await db.select({ verified: users.verified }).from(users).where(eq(users.id, client.userId)).limit(1);
  if (active === true && !account?.verified) return NextResponse.json({ error: "This account must be activated through its invitation before it can be made active." }, { status: 400 });
  if (email) {
    const duplicate = await pool.query("SELECT id FROM users WHERE email=$1 AND id <> $2", [email, client.userId]);
    if (duplicate.rows[0]) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  if (therapistId && therapistId !== client.therapistId) {
    const [nextTherapist] = await db.select().from(therapists).where(and(eq(therapists.id, therapistId), eq(therapists.active, true))).limit(1);
    if (!nextTherapist) return NextResponse.json({ error: "New therapist is not active." }, { status: 400 });
  }

  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");
    if (fullName !== undefined || email !== undefined || phone !== undefined || active !== undefined) {
      const sets: string[] = []; const values: unknown[] = [];
      const add = (column: string, value: unknown) => { values.push(value); sets.push(`${column}=$${values.length}`); };
      if (fullName !== undefined) add("full_name", fullName);
      if (email !== undefined) add("email", email);
      if (phone !== undefined) add("phone", phone);
      if (active !== undefined) add("active", active);
      values.push(client.userId);
      await pgClient.query(`UPDATE users SET ${sets.join(", ")} WHERE id=$${values.length}`, values);
    }
    if (therapistId && therapistId !== client.therapistId) {
      await pgClient.query("UPDATE clients SET therapist_id=$1 WHERE id=$2", [therapistId, id]);
      const existingConversation = await pgClient.query("SELECT id FROM conversations WHERE client_id=$1 AND therapist_id=$2 LIMIT 1", [id, therapistId]);
      if (!existingConversation.rows[0]) {
        await pgClient.query("INSERT INTO conversations (client_id, therapist_id) VALUES ($1, $2)", [id, therapistId]);
      }
    }
    await pgClient.query("COMMIT");
    await writeAuditLog({ actorUserId: user!.id, action: therapistId && therapistId !== client.therapistId ? "client.reassigned" : "client.updated", entityType: "client", entityId: id, metadata: { therapistId, active, emailChanged: Boolean(email) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await pgClient.query("ROLLBACK").catch(() => {});
    console.error("Admin update client failed", e);
    return NextResponse.json({ error: "Unable to update client." }, { status: 500 });
  } finally { pgClient.release(); }
}
