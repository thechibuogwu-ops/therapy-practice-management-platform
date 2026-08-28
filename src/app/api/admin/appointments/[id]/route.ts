import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, clients, notifications, therapists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED_STATUSES = new Set(["pending", "confirmed", "completed", "cancelled", "rescheduled", "no-show"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id } = await params;
  const { action, status } = await req.json();
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  const targetStatus = action === "cancel" ? "cancelled" : status;
  if (!ALLOWED_STATUSES.has(targetStatus)) return NextResponse.json({ error: "Invalid appointment status" }, { status: 400 });
  const [updated] = await db.update(appointments).set({ status: targetStatus as any }).where(eq(appointments.id, id)).returning();
  const [client] = await db.select({ userId: clients.userId }).from(clients).where(eq(clients.id, appointment.clientId)).limit(1);
  const [therapist] = await db.select({ userId: therapists.userId }).from(therapists).where(eq(therapists.id, appointment.therapistId)).limit(1);
  const notice = targetStatus === "cancelled" ? `Your appointment on ${appointment.date} at ${appointment.startTime} was cancelled by the practice.` : `Your appointment on ${appointment.date} at ${appointment.startTime} is now ${targetStatus}.`;
  if (client) await db.insert(notifications).values({ userId: client.userId, title: `Appointment ${targetStatus}`, body: notice });
  if (therapist) await db.insert(notifications).values({ userId: therapist.userId, title: `Appointment ${targetStatus}`, body: notice });
  await writeAuditLog({ actorUserId: user!.id, action: targetStatus === "cancelled" ? "appointment.admin_cancelled" : "appointment.admin_status_updated", entityType: "appointment", entityId: id, metadata: { status: targetStatus } });
  return NextResponse.json({ appointment: updated });
}
