import { pool } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { hashCheckoutToken, createTransactionReference } from "@/lib/payment-checkout";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

const ALLOWED_PROVIDERS = new Set(["paystack", "flutterwave"]);

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "payment-initialize"), 20, 15 * 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many payment attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  let client: import("pg").PoolClient | null = null;
  try {
    const body = await req.json();
    const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId : "";
    const provider = typeof body.provider === "string" ? body.provider : "paystack";
    const paymentAuthorization = typeof body.paymentAuthorization === "string" ? body.paymentAuthorization : "";
    if (!/^[0-9a-f-]{36}$/i.test(appointmentId) || !ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
    }
    if (paymentAuthorization && paymentAuthorization.length > 256) return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
    const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.NODE_ENV === "production" && !configuredAppUrl) {
      return NextResponse.json({ error: "Online payment is not configured." }, { status: 503 });
    }

    const authUser = await getAuthUser();
    if (authUser && authUser.role !== "client") return NextResponse.json({ error: "Payment initialization is only available to the appointment client." }, { status: 403 });
    if (!authUser && !paymentAuthorization) return NextResponse.json({ error: "Payment authorization is required." }, { status: 401 });

    client = await pool.connect();
    await client.query("BEGIN");
    const appointmentResult = await client.query(
      `SELECT a.id, a.client_id, a.service_id, a.status, a.payment_status, s.name AS "serviceName", s.price_kes AS "priceKES", s.active AS "serviceActive", u.email
       FROM appointments a
       INNER JOIN clients c ON a.client_id=c.id
       INNER JOIN users u ON c.user_id=u.id
       INNER JOIN services s ON a.service_id=s.id
       WHERE a.id=$1 FOR UPDATE OF a, c, u, s`, [appointmentId],
    );
    const appointment = appointmentResult.rows[0];
    if (!appointment || !appointment.service_id || appointment.priceKES == null) {
      await client.query("ROLLBACK"); return NextResponse.json({ error: "Appointment payment details are unavailable." }, { status: 404 });
    }
    if (["cancelled", "completed", "no-show"].includes(appointment.status)) {
      await client.query("ROLLBACK"); return NextResponse.json({ error: "Payment is not available for this appointment." }, { status: 400 });
    }
    if (appointment.payment_status === "successful") {
      await client.query("ROLLBACK"); return NextResponse.json({ error: "Appointment is already paid." }, { status: 400 });
    }

    let checkoutTokenId: string | null = null;
    if (authUser) {
      const ownership = await client.query(`SELECT id FROM clients WHERE id=$1 AND user_id=$2`, [appointment.client_id, authUser.id]);
      if (!ownership.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Appointment not found or unauthorized." }, { status: 403 }); }
    } else {
      const token = await client.query(
        `SELECT id FROM payment_checkout_tokens
         WHERE appointment_id=$1 AND token_hash=$2 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [appointmentId, hashCheckoutToken(paymentAuthorization)],
      );
      if (!token.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Payment authorization is invalid or expired." }, { status: 403 }); }
      checkoutTokenId = token.rows[0].id;
    }

    const amountKES = Number(appointment.priceKES);
    if (!Number.isInteger(amountKES) || amountKES < 0) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Appointment payment details are invalid." }, { status: 400 }); }
    if (amountKES === 0) {
      await client.query(`UPDATE appointments SET payment_status='successful' WHERE id=$1 AND status IN ('pending','confirmed','rescheduled')`, [appointmentId]);
      await client.query("COMMIT");
      return NextResponse.json({ status: "free", message: "No payment required." });
    }

    const existing = await client.query(
      `SELECT id, transaction_ref AS "transactionRef" FROM payments WHERE appointment_id=$1 AND provider=$2 AND status='pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [appointmentId, provider],
    );
    let transactionRef = existing.rows[0]?.transactionRef as string | undefined;
    if (!transactionRef) {
      transactionRef = createTransactionReference();
      await client.query(
        `INSERT INTO payments (client_id, appointment_id, amount_kes, currency, provider, transaction_ref, status)
         VALUES ($1,$2,$3,'KES',$4,$5,'pending')`,
        [appointment.client_id, appointmentId, amountKES, provider, transactionRef],
      );
    }
    if (checkoutTokenId) {
      await client.query(`UPDATE payment_checkout_tokens SET used_at = NOW() WHERE id=$1`, [checkoutTokenId]);
    }
    await client.query("COMMIT");

    const appUrl = (configuredAppUrl || "http://localhost:3000").replace(/\/$/, "");
    if (provider === "paystack") {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) return NextResponse.json({ status: "manual", transactionRef, amountKES, message: "Online payment is not configured. Please contact the practice to arrange payment." });
      const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: appointment.email, amount: amountKES * 100, currency: "KES", reference: transactionRef, callback_url: `${appUrl}/book/confirmation?ref=${encodeURIComponent(transactionRef)}` }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.status || !payload?.data?.authorization_url) return NextResponse.json({ error: "Payment provider could not initialize the transaction." }, { status: 502 });
      return NextResponse.json({ status: "redirect", paymentUrl: payload.data.authorization_url, transactionRef, amountKES });
    }

    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) return NextResponse.json({ status: "manual", transactionRef, amountKES, message: "Online payment is not configured. Please contact the practice to arrange payment." });
    const response = await fetch("https://api.flutterwave.com/v3/payments", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ tx_ref: transactionRef, amount: amountKES, currency: "KES", redirect_url: `${appUrl}/book/confirmation?ref=${encodeURIComponent(transactionRef)}`, customer: { email: appointment.email }, payment_options: "card,mpesa" }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status !== "success" || !payload?.data?.link) return NextResponse.json({ error: "Payment provider could not initialize the transaction." }, { status: 502 });
    return NextResponse.json({ status: "redirect", paymentUrl: payload.data.link, transactionRef, amountKES });
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Payment initialization failed");
    return NextResponse.json({ error: "Payment initialization failed." }, { status: 500 });
  } finally { client?.release(); }
}
