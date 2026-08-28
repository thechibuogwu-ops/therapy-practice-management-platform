import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getClientRecord } from "@/lib/auth-utils";
import { db } from "@/db";
import { payments, appointments, services, clients, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") || "50"), 100);

  if (user!.role === "client") {
    const client = await getClientRecord(user!.id);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows = await db.select({
      id: payments.id, amountKES: payments.amountKES, currency: payments.currency, provider: payments.provider,
      method: payments.method, status: payments.status, transactionRef: payments.transactionRef, createdAt: payments.createdAt,
      appointmentDate: appointments.date, serviceName: services.name,
    }).from(payments)
      .leftJoin(appointments, eq(payments.appointmentId, appointments.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(payments.clientId, client.id))
      .orderBy(desc(payments.createdAt)).limit(limit);
    return NextResponse.json({ payments: rows });
  }

  if (user!.role === "admin") {
    const rows = await db.execute(sql`
      SELECT p.id, p.amount_kes as "amountKES", p.currency, p.provider, p.method, p.status,
        p.transaction_ref as "transactionRef", p.created_at as "createdAt",
        a.date as "appointmentDate", s.name as "serviceName", u.full_name as "clientName"
      FROM payments p
      LEFT JOIN appointments a ON p.appointment_id = a.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON c.user_id = u.id
      ORDER BY p.created_at DESC LIMIT ${limit}
    `);
    return NextResponse.json({ payments: rows.rows });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
