import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth-utils";
import { createInvitationInTransaction, getInvitationPresentation } from "@/lib/invitations";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id } = await params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await client.query(
      `SELECT id, role, active, verified FROM users WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const target = account.rows[0];
    if (!target || !["client", "therapist"].includes(target.role)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (target.active || target.verified) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This account is already activated and cannot receive an activation invitation." }, { status: 400 });
    }
    const invitation = await createInvitationInTransaction(client, { userId: id, invitedBy: user!.id });
    await client.query("COMMIT");
    await writeAuditLog({ actorUserId: user!.id, action: "invitation.resent", entityType: "user", entityId: id, metadata: { role: target.role } });
    return NextResponse.json({ invitation: getInvitationPresentation(invitation.rawToken, invitation.expiresAt) });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Invitation resend failed");
    return NextResponse.json({ error: "Unable to create a new invitation." }, { status: 500 });
  } finally {
    client.release();
  }
}
