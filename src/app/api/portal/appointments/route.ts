import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getClientRecord, getTherapistRecord } from "@/lib/auth-utils";
import { db } from "@/db";
import { appointments, clients, therapists, users, services } from "@/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");     // YYYY-MM-DD
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  if (user!.role === "client") {
    const client = await getClientRecord(user!.id);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const conditions: any[] = [eq(appointments.clientId, client.id)];
    if (status) conditions.push(eq(appointments.status, status as any));
    if (from) conditions.push(gte(appointments.date, from));
    if (to) conditions.push(lte(appointments.date, to));
    const rows = await db.select({
      id: appointments.id, date: appointments.date, startTime: appointments.startTime, endTime: appointments.endTime,
      status: appointments.status, paymentStatus: appointments.paymentStatus, meetingLink: appointments.meetingLink,
      serviceName: services.name, servicePrice: services.priceKES,
      therapistName: users.fullName,
    }).from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(therapists, eq(appointments.therapistId, therapists.id))
      .leftJoin(users, eq(therapists.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.date), desc(appointments.startTime))
      .limit(limit).offset(offset);
    return NextResponse.json({ appointments: rows });
  }

  if (user!.role === "therapist") {
    const therapist = await getTherapistRecord(user!.id);
    if (!therapist) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const conditions: any[] = [eq(appointments.therapistId, therapist.id), eq(clients.therapistId, therapist.id)];
    const requestedClientId = searchParams.get("clientId");
    if (requestedClientId) conditions.push(eq(appointments.clientId, requestedClientId));
    if (status) conditions.push(eq(appointments.status, status as any));
    if (from) conditions.push(gte(appointments.date, from));
    if (to) conditions.push(lte(appointments.date, to));
    const rows = await db.select({
      id: appointments.id, date: appointments.date, startTime: appointments.startTime, endTime: appointments.endTime,
      status: appointments.status, paymentStatus: appointments.paymentStatus, meetingLink: appointments.meetingLink, notes: appointments.notes,
      serviceName: services.name, servicePrice: services.priceKES,
      clientName: users.fullName, clientEmail: users.email,
    }).from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(users, eq(clients.userId, users.id))
      .where(and(...conditions))
      .orderBy(appointments.date, appointments.startTime)
      .limit(limit).offset(offset);
    return NextResponse.json({ appointments: rows });
  }

  if (user!.role === "admin") {
    let whereClause = sql`1=1`;
    if (status) whereClause = sql`${whereClause} AND a.status = ${status}`;
    if (from) whereClause = sql`${whereClause} AND a.date >= ${from}`;
    if (to) whereClause = sql`${whereClause} AND a.date <= ${to}`;
    const therapistId = searchParams.get("therapistId");
    if (therapistId) whereClause = sql`${whereClause} AND a.therapist_id = ${therapistId}`;

    const rows = await db.execute(sql`
      SELECT a.id, a.date, a.start_time as "startTime", a.end_time as "endTime", a.status, a.payment_status as "paymentStatus",
        a.meeting_link as "meetingLink", s.name as "serviceName", s.price_kes as "servicePrice",
        cu.full_name as "clientName", tu.full_name as "therapistName"
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN clients c ON a.client_id = c.id LEFT JOIN users cu ON c.user_id = cu.id
      LEFT JOIN therapists t ON a.therapist_id = t.id LEFT JOIN users tu ON t.user_id = tu.id
      WHERE ${whereClause}
      ORDER BY a.date DESC, a.start_time DESC LIMIT ${limit} OFFSET ${offset}
    `);
    return NextResponse.json({ appointments: rows.rows });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
