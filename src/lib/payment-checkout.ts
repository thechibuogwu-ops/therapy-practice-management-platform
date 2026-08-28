import crypto from "crypto";
import type { PoolClient } from "pg";

const CHECKOUT_EXPIRY_MINUTES = Math.max(1, Number(process.env.PAYMENT_CHECKOUT_EXPIRY_MINUTES || "30"));

export function hashCheckoutToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createCheckoutTokenInTransaction(client: PoolClient, appointmentId: string) {
  await client.query(
    `UPDATE payment_checkout_tokens
     SET revoked_at = NOW()
     WHERE appointment_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [appointmentId],
  );
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60 * 1000);
  await client.query(
    `INSERT INTO payment_checkout_tokens (appointment_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [appointmentId, hashCheckoutToken(rawToken), expiresAt],
  );
  return { rawToken, expiresAt };
}

export function createTransactionReference() {
  return `DIBA-${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;
}
