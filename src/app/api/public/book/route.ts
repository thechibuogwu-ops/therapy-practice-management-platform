import { pool } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { validateAndLockSlot } from "@/lib/scheduling";
import { createInvitationInTransaction, createUnusablePasswordHash } from "@/lib/invitations";
import { createCheckoutTokenInTransaction } from "@/lib/payment-checkout";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

const MAX_BOOKING_NOTES_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "public-booking"), 20, 15 * 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many booking attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });

  let pgClient: import("pg").PoolClient | null = null;
  try {
    const body = await req.json();
    const therapistId = typeof body.therapistId === "string" ? body.therapistId : "";
    const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
    const date = typeof body.date === "string" ? body.date : "";
    const startTime = typeof body.startTime === "string" ? body.startTime : "";
    const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : "";
    const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
    const clientPhone = typeof body.clientPhone === "string" ? body.clientPhone.trim() : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!/^[0-9a-f-]{36}$/i.test(therapistId) || !/^[0-9a-f-]{36}$/i.test(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: "Invalid booking details." }, { status: 400 });
    }
    if (notes.length > MAX_BOOKING_NOTES_LENGTH) return NextResponse.json({ error: "Booking note is too long." }, { status: 400 });

    const authUser = await getAuthUser();
    if (authUser && authUser.role !== "client") return NextResponse.json({ error: "Only client accounts can make bookings." }, { status: 403 });
    if (!authUser && (!clientEmail || !clientName || !/^\S+@\S+\.\S+$/.test(clientEmail) || clientName.length > 120 || (clientPhone && clientPhone.length > 30))) {
      return NextResponse.json({ error: "A valid name and email are required for public booking." }, { status: 400 });
    }

    pgClient = await pool.connect();
    await pgClient.query("BEGIN");
    const validation = await validateAndLockSlot(pgClient, { therapistId, serviceId, date, startTime });
    if (!validation.ok) {
      await pgClient.query("ROLLBACK");
      const status = validation.error?.includes("no longer available") ? 409 : 400;
      return NextResponse.json({ error: validation.error }, { status });
    }

    let clientId: string;
    let invitationCreated = false;
    if (authUser) {
      const clientResult = await pgClient.query(`SELECT id, therapist_id FROM clients WHERE user_id=$1 FOR UPDATE`, [authUser.id]);
      const client = clientResult.rows[0];
      if (!client) { await pgClient.query("ROLLBACK"); return NextResponse.json({ error: "Client record not found." }, { status: 400 }); }
      if (client.therapist_id !== therapistId) { await pgClient.query("ROLLBACK"); return NextResponse.json({ error: "You can only book with your assigned therapist." }, { status: 403 }); }
      clientId = client.id;
    } else {
      const existingUserResult = await pgClient.query(`SELECT id, role, active, verified FROM users WHERE email=$1 FOR UPDATE`, [clientEmail]);
      let userId: string;
      const existingUser = existingUserResult.rows[0];
      if (existingUser) {
        if (existingUser.role !== "client") { await pgClient.query("ROLLBACK"); return NextResponse.json({ error: "This email is already associated with a different account type." }, { status: 409 }); }
        if (existingUser.active || existingUser.verified) {
          await pgClient.query("ROLLBACK");
          return NextResponse.json({ error: "Please sign in to book using your existing client account." }, { status: 401 });
        }
        userId = existingUser.id;
      } else {
        const passwordHash = await createUnusablePasswordHash();
        const created = await pgClient.query(
          `INSERT INTO users (email,password_hash,role,full_name,phone,active,verified)
           VALUES ($1,$2,'client',$3,$4,false,false) RETURNING id`,
          [clientEmail, passwordHash, clientName, clientPhone],
        );
        userId = created.rows[0].id;
        invitationCreated = true;
      }
      const existingClientResult = await pgClient.query(`SELECT id, therapist_id FROM clients WHERE user_id=$1 FOR UPDATE`, [userId]);
      const existingClient = existingClientResult.rows[0];
      if (existingClient) {
        if (existingClient.therapist_id !== therapistId) { await pgClient.query("ROLLBACK"); return NextResponse.json({ error: "This client is already assigned to another therapist." }, { status: 403 }); }
        clientId = existingClient.id;
        if (!existingUser?.active || !existingUser?.verified) invitationCreated = true;
      } else {
        const createdClient = await pgClient.query(`INSERT INTO clients (user_id,therapist_id) VALUES ($1,$2) RETURNING id`, [userId, therapistId]);
        clientId = createdClient.rows[0].id;
        await pgClient.query(`INSERT INTO conversations (client_id,therapist_id,created_at,updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (client_id,therapist_id) DO NOTHING`, [clientId, therapistId]);
      }
      if (invitationCreated) await createInvitationInTransaction(pgClient, { userId, invitedBy: null });
    }

    const appointmentResult = await pgClient.query(
      `INSERT INTO appointments (client_id, therapist_id, service_id, date, start_time, end_time, status, payment_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8) RETURNING *`,
      [clientId, therapistId, serviceId, date, startTime, validation.endTime, validation.service!.priceKES > 0 ? "pending" : "successful", notes || null],
    );
    const appointment = appointmentResult.rows[0];
    let checkoutToken: string | null = null;
    if (!authUser && validation.service!.priceKES > 0) {
      checkoutToken = (await createCheckoutTokenInTransaction(pgClient, appointment.id)).rawToken;
    }
    await pgClient.query("COMMIT");

    return NextResponse.json({
      appointment: { id: appointment.id, date: appointment.date, startTime: appointment.start_time, endTime: appointment.end_time, status: appointment.status, paymentStatus: appointment.payment_status },
      service: validation.service,
      ...(checkoutToken ? { paymentAuthorization: checkoutToken } : {}),
      ...(invitationCreated ? { invitationCreated: true, invitationEmailDelivery: "not_configured" } : {}),
    }, { status: 201 });
  } catch {
    if (pgClient) await pgClient.query("ROLLBACK").catch(() => {});
    console.error("Booking failed");
    return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
  } finally {
    pgClient?.release();
  }
}
