import crypto from "crypto";
import { pool } from "@/db";
import { NextRequest, NextResponse } from "next/server";

function timingSafeEqualHex(expected: string, provided: string | null) {
  if (!provided || expected.length !== provided.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex")); } catch { return false; }
}

function timingSafeEqualText(expected: string, provided: string | null) {
  if (!provided || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

async function markSuccessful(reference: string, provider: "paystack" | "flutterwave", amountKES: number, currency: string, method: string | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT p.id, p.appointment_id, p.amount_kes, p.currency, p.provider, p.status, a.status AS "appointmentStatus"
       FROM payments p INNER JOIN appointments a ON p.appointment_id=a.id
       WHERE p.transaction_ref=$1 FOR UPDATE OF p, a`, [reference],
    );
    const payment = result.rows[0];
    if (!payment || payment.provider !== provider || Number(payment.amount_kes) !== amountKES || payment.currency !== currency) {
      await client.query("ROLLBACK"); return false;
    }
    if (payment.status !== "successful") {
      await client.query(`UPDATE payments SET status='successful', method=COALESCE($1,method) WHERE id=$2`, [method, payment.id]);
      if (payment.appointment_id) {
        await client.query(
          `UPDATE appointments
           SET payment_status='successful',
               status = CASE WHEN status IN ('pending','rescheduled') THEN 'confirmed' ELSE status END
           WHERE id=$1`,
          [payment.appointment_id],
        );
      }
    }
    await client.query("COMMIT");
    return true;
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return false;
  } finally { client.release(); }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload: any;
    try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 }); }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const paystackSignature = req.headers.get("x-paystack-signature");
    if (paystackSecret && paystackSignature) {
      const expected = crypto.createHmac("sha512", paystackSecret).update(rawBody).digest("hex");
      if (!timingSafeEqualHex(expected, paystackSignature)) return NextResponse.json({ error: "Unverified webhook" }, { status: 401 });
      if (payload.event === "charge.success") {
        const reference = typeof payload.data?.reference === "string" ? payload.data.reference : "";
        const amount = Number(payload.data?.amount);
        const currency = payload.data?.currency;
        if (!reference || !Number.isInteger(amount) || amount <= 0 || currency !== "KES") return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
        const valid = await markSuccessful(reference, "paystack", amount / 100, currency, typeof payload.data?.channel === "string" ? payload.data.channel : null);
        if (!valid) return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }
      return NextResponse.json({ status: "ok" });
    }

    const flutterwaveHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const providedFlutterwaveHash = req.headers.get("verif-hash");
    if (flutterwaveHash && providedFlutterwaveHash) {
      if (!timingSafeEqualText(flutterwaveHash, providedFlutterwaveHash)) return NextResponse.json({ error: "Unverified webhook" }, { status: 401 });
      const reference = typeof payload.data?.tx_ref === "string" ? payload.data.tx_ref : "";
      if (payload.data?.status === "successful") {
        const amount = Number(payload.data?.amount);
        const currency = payload.data?.currency;
        if (!reference || !Number.isFinite(amount) || amount <= 0 || currency !== "KES") return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
        const valid = await markSuccessful(reference, "flutterwave", amount, currency, typeof payload.data?.payment_type === "string" ? payload.data.payment_type : null);
        if (!valid) return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Unverified webhook" }, { status: 401 });
  } catch {
    console.error("Payment webhook processing failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
