import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTherapistRecord } from "@/lib/auth-utils";
import { db, pool } from "@/db";
import { clients, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateAndLockSlot } from "@/lib/scheduling";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const therapist = await getTherapistRecord(user!.id);
  if (!therapist) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });

  const { clientId, serviceId, date, startTime, notes } = await req.json();
  if (!clientId || !serviceId || !date || !startTime) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Verify client belongs to this therapist
  const [client] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.therapistId, therapist.id))).limit(1);
  if (!client) return NextResponse.json({ error: "Client not found or not authorized" }, { status: 403 });

  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");

    const validation = await validateAndLockSlot(pgClient, { therapistId: therapist.id, serviceId, date, startTime });
    if (!validation.ok) {
      await pgClient.query("ROLLBACK");
      const status = validation.error?.includes("no longer available") ? 409 : 400;
      return NextResponse.json({ error: validation.error }, { status });
    }

    const endTime = validation.endTime!;
    const service = validation.service!;

    const result = await pgClient.query(
      `INSERT INTO appointments (client_id, therapist_id, service_id, date, start_time, end_time, status, payment_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8) RETURNING *`,
      [clientId, therapist.id, serviceId, date, startTime, endTime,
       service.priceKES > 0 ? "pending" : "successful", notes || null]
    );

    await pgClient.query("COMMIT");

    const appt = result.rows[0];

    // Notify client
    await db.insert(notifications).values({
      userId: client.userId,
      title: "New Appointment Scheduled",
      body: `Your therapist scheduled an appointment on ${date} at ${startTime}.`,
    });

    return NextResponse.json({
      appointment: {
        id: appt.id, date: appt.date, startTime: appt.start_time, endTime: appt.end_time,
        status: appt.status, paymentStatus: appt.payment_status,
      },
      service: { name: service.name, priceKES: service.priceKES, durationMinutes: service.durationMinutes },
    });
  } catch (e: any) {
    await pgClient.query("ROLLBACK").catch(() => {});
    console.error("Therapist booking error:", e);
    return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
  } finally {
    pgClient.release();
  }
}
