import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getClientRecord, getTherapistRecord } from "@/lib/auth-utils";
import { db, pool } from "@/db";
import { appointments, notifications, clients, therapists, services } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { validateAndLockSlot, formatTime, parseTime } from "@/lib/scheduling";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  const [appt] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  // Authorization
  if (user!.role === "client") {
    const client = await getClientRecord(user!.id);
    if (!client || appt.clientId !== client.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["cancel", "reschedule"].includes(action)) return NextResponse.json({ error: "Action not permitted" }, { status: 403 });
  } else if (user!.role === "therapist") {
    const therapist = await getTherapistRecord(user!.id);
    const [currentClient] = therapist ? await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, appt.clientId), eq(clients.therapistId, therapist.id))).limit(1) : [];
    if (!therapist || appt.therapistId !== therapist.id || !currentClient) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (user!.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Helper to notify the other party
  async function notifyOther(title: string, msg: string) {
    const otherUserId = user!.role === "client"
      ? (await db.select({ userId: therapists.userId }).from(therapists).where(eq(therapists.id, appt.therapistId)).limit(1))[0]?.userId
      : (await db.select({ userId: clients.userId }).from(clients).where(eq(clients.id, appt.clientId)).limit(1))[0]?.userId;
    if (otherUserId) {
      await db.insert(notifications).values({ userId: otherUserId, title, body: msg });
    }
  }

  // ── Cancel ──
  if (action === "cancel") {
    if (appt.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    const [updated] = await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, id)).returning();
    await notifyOther("Appointment Cancelled", `Your appointment on ${appt.date} at ${appt.startTime} has been cancelled.`);
    return NextResponse.json({ appointment: updated });
  }

  // ── Reschedule ──
  if (action === "reschedule") {
    const { date, startTime } = body;
    if (!date || !startTime) return NextResponse.json({ error: "date and startTime required for rescheduling" }, { status: 400 });
    if (["cancelled", "completed", "no-show"].includes(appt.status || "")) {
      return NextResponse.json({ error: "Cannot reschedule this appointment" }, { status: 400 });
    }

    // Get the service to determine duration (server-calculated endTime)
    const serviceId = appt.serviceId;
    if (!serviceId) return NextResponse.json({ error: "Appointment has no associated service" }, { status: 400 });

    const pgClient = await pool.connect();
    try {
      await pgClient.query("BEGIN");

      // Acquire the target therapist/date advisory lock BEFORE locking the source
      // record. This order prevents competing reschedules into the same target
      // slot from deadlocking.
      const validation = await validateAndLockSlot(pgClient, {
        therapistId: appt.therapistId,
        serviceId,
        date,
        startTime,
        excludeAppointmentId: id,
      });

      if (!validation.ok) {
        await pgClient.query("ROLLBACK");
        const status = validation.error?.includes("no longer available") ? 409 : 400;
        return NextResponse.json({ error: validation.error }, { status });
      }

      // Lock the source record immediately before mutation. A simultaneous
      // cancellation or reschedule waits here and observes the committed state.
      const lockedAppointment = await pgClient.query(
        "SELECT id, therapist_id, service_id, status FROM appointments WHERE id = $1 FOR UPDATE",
        [id]
      );
      const current = lockedAppointment.rows[0];
      if (!current || ["cancelled", "completed", "no-show"].includes(current.status)) {
        await pgClient.query("ROLLBACK");
        return NextResponse.json({ error: "Cannot reschedule this appointment" }, { status: 400 });
      }
      if (current.therapist_id !== appt.therapistId || current.service_id !== serviceId) {
        await pgClient.query("ROLLBACK");
        return NextResponse.json({ error: "Appointment changed during rescheduling. Please try again." }, { status: 409 });
      }

      const endTime = validation.endTime!;

      // Update the SAME appointment record
      await pgClient.query(
        `UPDATE appointments SET date = $1, start_time = $2, end_time = $3, status = 'rescheduled' WHERE id = $4`,
        [date, startTime, endTime, id]
      );

      await pgClient.query("COMMIT");

      const [updated] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
      await notifyOther("Appointment Rescheduled", `Appointment rescheduled to ${date} at ${startTime}.`);
      return NextResponse.json({ appointment: updated });
    } catch (e) {
      await pgClient.query("ROLLBACK").catch(() => {});
      console.error("Reschedule error:", e);
      return NextResponse.json({ error: "Rescheduling failed. Please try again." }, { status: 500 });
    } finally {
      pgClient.release();
    }
  }

  // ── Confirm / Complete / No-show ──
  if (["confirm", "complete", "no-show"].includes(action)) {
    if (user!.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const statusMap: Record<string, string> = { confirm: "confirmed", complete: "completed", "no-show": "no-show" };
    const [updated] = await db.update(appointments).set({ status: statusMap[action] as any }).where(eq(appointments.id, id)).returning();
    const clientUserId = (await db.select({ userId: clients.userId }).from(clients).where(eq(clients.id, appt.clientId)).limit(1))[0]?.userId;
    if (clientUserId) {
      await db.insert(notifications).values({ userId: clientUserId, title: `Appointment ${statusMap[action].charAt(0).toUpperCase() + statusMap[action].slice(1)}`, body: `Your appointment on ${appt.date} at ${appt.startTime} has been ${statusMap[action]}.` });
    }
    return NextResponse.json({ appointment: updated });
  }

  // ── Update meeting link ──
  if (action === "update-link") {
    if (user!.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const meetingLink = typeof body.meetingLink === "string" ? body.meetingLink.trim() : "";
    if (meetingLink.length > 2048) return NextResponse.json({ error: "Meeting link is too long." }, { status: 400 });
    if (meetingLink) {
      try {
        const url = new URL(meetingLink);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      } catch {
        return NextResponse.json({ error: "Meeting link must be a valid HTTP or HTTPS URL." }, { status: 400 });
      }
    }
    const [updated] = await db.update(appointments).set({ meetingLink: meetingLink || null }).where(eq(appointments.id, id)).returning();
    return NextResponse.json({ appointment: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
