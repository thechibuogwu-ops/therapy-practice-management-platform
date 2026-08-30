import crypto from "crypto";
import type { PoolClient } from "pg";
import { hashPassword } from "@/lib/auth";

const INVITATION_EXPIRY_DAYS = Math.max(1, Number(process.env.INVITATION_EXPIRY_DAYS || "7"));

export function hashInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createUnusablePasswordHash(): Promise<string> {
  return hashPassword(crypto.randomBytes(48).toString("base64url"));
}

export async function createInvitationInTransaction(client: PoolClient, input: { userId: string; invitedBy: string | null }) {
  // There can be only one usable invitation for an account at a time.
  await client.query(
    `UPDATE invitations
     SET revoked_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [input.userId]
  );

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const result = await client.query(
    `INSERT INTO invitations (user_id, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, expires_at AS "expiresAt"`,
    [input.userId, tokenHash, input.invitedBy, expiresAt]
  );

  return { invitationId: result.rows[0].id as string, expiresAt: result.rows[0].expiresAt as Date, rawToken };
}

export function getInvitationPresentation(rawToken: string, expiresAt: Date) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const explicitDevOrDemoMode = process.env.NODE_ENV === "development" || process.env.APP_ENV === "demo";
  const showManualUrl = process.env.SHOW_INVITATION_URLS === "true" && explicitDevOrDemoMode;

  return {
    invitationCreated: true,
    emailDelivery: "not_configured" as const,
    expiresAt: expiresAt.toISOString(),
    // Intentionally omitted in production. The raw token never reaches a production API response.
    ...(showManualUrl ? { activationUrl: `${baseUrl}/activate-account?token=${encodeURIComponent(rawToken)}` } : {}),
  };
}

export function buildActivationUrl(rawToken: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/activate-account?token=${encodeURIComponent(rawToken)}`;
}