import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { hashPassword, signToken } from "@/lib/auth";
import { hashInvitationToken } from "@/lib/invitations";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

function invitationState(row: any) {
  if (!row) return { status: "invalid", message: "This invitation is invalid. Please contact the practice." };
  if (row.used_at) return { status: "used", message: "This invitation has already been used. Please sign in or request a new invitation." };
  if (row.revoked_at) return { status: "replaced", message: "This invitation has been replaced. Please use the most recent invitation." };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { status: "expired", message: "This invitation has expired. Please request a new invitation." };
  if (row.active || row.verified) return { status: "used", message: "This account is already active. Please sign in." };
  if (row.role !== "client" && row.role !== "therapist") return { status: "invalid", message: "This invitation cannot be activated." };
  return null;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token) return NextResponse.json({ status: "invalid", message: "This invitation is invalid. Please contact the practice." }, { status: 400 });
  const tokenHash = hashInvitationToken(token);
  const result = await pool.query(
    `SELECT i.used_at, i.revoked_at, i.expires_at, u.full_name, u.role, u.active
     FROM invitations i INNER JOIN users u ON i.user_id = u.id
     WHERE i.token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  const problem = invitationState(result.rows[0]);
  if (problem) return NextResponse.json(problem, { status: problem.status === "invalid" ? 400 : 410 });
  return NextResponse.json({
    status: "valid",
    firstName: String(result.rows[0].full_name || "").split(" ")[0] || "there",
    role: result.rows[0].role,
    expiresAt: result.rows[0].expires_at,
  });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "activate-account"), 10, 15 * 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const { token, password, confirmPassword } = await req.json();
  if (!token || typeof token !== "string" || token.length > 256) return NextResponse.json({ error: "This invitation is invalid. Please contact the practice." }, { status: 400 });
  if (typeof password !== "string" || password.length < 8 || password.length > 256) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });

  const tokenHash = hashInvitationToken(token);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT i.id, i.user_id, i.used_at, i.revoked_at, i.expires_at,
              u.email, u.full_name, u.role, u.active
       FROM invitations i INNER JOIN users u ON i.user_id = u.id
       WHERE i.token_hash = $1 FOR UPDATE`,
      [tokenHash]
    );
    const row = result.rows[0];
    const problem = invitationState(row);
    if (problem) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: problem.message, status: problem.status }, { status: problem.status === "invalid" ? 400 : 410 });
    }

    const passwordHash = await hashPassword(password);
    await client.query(
      `UPDATE users SET password_hash = $1, active = true, verified = true WHERE id = $2`,
      [passwordHash, row.user_id]
    );
    await client.query(`UPDATE invitations SET used_at = NOW() WHERE id = $1`, [row.id]);
    await client.query(
      `UPDATE invitations SET revoked_at = NOW() WHERE user_id = $1 AND id <> $2 AND used_at IS NULL AND revoked_at IS NULL`,
      [row.user_id, row.id]
    );
    await client.query("COMMIT");
    await writeAuditLog({ actorUserId: row.user_id, action: "invitation.activated", entityType: "user", entityId: row.user_id, metadata: { role: row.role } });

    const redirectTo = row.role === "therapist" ? "/therapist" : "/client";
    const authToken = signToken({ id: row.user_id, email: row.email, role: row.role });
    const response = NextResponse.json({ ok: true, redirectTo });
    response.cookies.set("auth_token", authToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return response;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Account activation failed");
    return NextResponse.json({ error: "Unable to activate this account. Please try again." }, { status: 500 });
  } finally {
    client.release();
  }
}
