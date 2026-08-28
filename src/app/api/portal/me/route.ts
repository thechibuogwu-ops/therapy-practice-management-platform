import { NextResponse } from "next/server";
import { requireAuth, getClientRecord, getTherapistRecord } from "@/lib/auth-utils";
import { db } from "@/db";
import { users, clients, therapists, appointments, conversations, messages, documents, payments, services } from "@/db/schema";
import { eq, and, desc, sql, gte, ne } from "drizzle-orm";
import { getNairobiToday } from "@/lib/practice-time";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const today = getNairobiToday();

  if (user!.role === "client") {
    const client = await getClientRecord(user!.id);
    if (!client) return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    // Get therapist info
    const [therapist] = await db.select({ id: therapists.id, bio: therapists.bio, specialty: therapists.specialty, userId: therapists.userId }).from(therapists).where(eq(therapists.id, client.therapistId)).limit(1);
    let therapistUser = null;
    if (therapist) {
      const [tu] = await db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, therapist.userId)).limit(1);
      therapistUser = tu;
    }
    // Upcoming appointments: intentionally omit internal appointment notes and raw relationship IDs.
    const upcomingAppts = await db.select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      meetingLink: appointments.meetingLink,
    }).from(appointments).where(and(eq(appointments.clientId, client.id), gte(appointments.date, today), ne(appointments.status, "cancelled"))).orderBy(appointments.date, appointments.startTime).limit(3);
    // Unread messages
    const [unreadResult] = await db.select({ count: sql<number>`count(*)` }).from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.clientId, client.id), eq(conversations.therapistId, client.therapistId), eq(messages.read, false), ne(messages.senderId, user!.id)));
    // Recent document metadata only; protected download endpoints resolve storage paths server-side.
    const recentDocs = await db.select({
      id: documents.id,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      category: documents.category,
      createdAt: documents.createdAt,
      uploadedBy: documents.uploadedBy,
    }).from(documents).where(eq(documents.clientId, client.id)).orderBy(desc(documents.createdAt)).limit(3);
    // Payment summary
    const [paymentSummary] = await db.select({ pending: sql<number>`count(*) filter (where status = 'pending')`, successful: sql<number>`count(*) filter (where status = 'successful')` }).from(payments).where(eq(payments.clientId, client.id));

    return NextResponse.json({
      role: "client", clientId: client.id,
      user: { id: user!.id, fullName: user!.fullName, email: user!.email, phone: user!.phone },
      therapist: therapist ? { id: therapist.id, ...therapistUser, bio: therapist.bio, specialty: therapist.specialty } : null,
      upcomingAppointments: upcomingAppts,
      unreadMessages: Number(unreadResult?.count || 0),
      recentDocuments: recentDocs,
      payments: { pending: Number(paymentSummary?.pending || 0), successful: Number(paymentSummary?.successful || 0) },
    });
  }

  if (user!.role === "therapist") {
    const therapist = await getTherapistRecord(user!.id);
    if (!therapist) return NextResponse.json({ error: "Therapist record not found" }, { status: 404 });
    const [clientCount] = await db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.therapistId, therapist.id));
    const todayAppts = await db.select({ id: appointments.id, clientId: appointments.clientId, clientName: users.fullName, therapistId: appointments.therapistId, serviceId: appointments.serviceId, date: appointments.date, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status, paymentStatus: appointments.paymentStatus }).from(appointments).innerJoin(clients, eq(appointments.clientId, clients.id)).innerJoin(users, eq(clients.userId, users.id)).where(and(eq(appointments.therapistId, therapist.id), eq(clients.therapistId, therapist.id), eq(appointments.date, today), ne(appointments.status, "cancelled"))).orderBy(appointments.startTime);
    const upcomingAppts = await db.select({ id: appointments.id, clientId: appointments.clientId, clientName: users.fullName, therapistId: appointments.therapistId, serviceId: appointments.serviceId, date: appointments.date, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status, paymentStatus: appointments.paymentStatus }).from(appointments).innerJoin(clients, eq(appointments.clientId, clients.id)).innerJoin(users, eq(clients.userId, users.id)).where(and(eq(appointments.therapistId, therapist.id), eq(clients.therapistId, therapist.id), gte(appointments.date, today), ne(appointments.status, "cancelled"))).orderBy(appointments.date, appointments.startTime).limit(5);
    const [unreadResult] = await db.select({ count: sql<number>`count(*)` }).from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(clients, eq(conversations.clientId, clients.id))
      .where(and(eq(conversations.therapistId, therapist.id), eq(clients.therapistId, therapist.id), eq(messages.read, false), ne(messages.senderId, user!.id)));
    const recentDocs = await db.select({ id: documents.id, fileName: documents.fileName, fileSize: documents.fileSize, mimeType: documents.mimeType, category: documents.category, createdAt: documents.createdAt, clientId: documents.clientId }).from(documents).innerJoin(clients, eq(documents.clientId, clients.id)).where(eq(clients.therapistId, therapist.id)).orderBy(desc(documents.createdAt)).limit(5);
    const recentClients = await db.select({ id: clients.id, fullName: users.fullName, email: users.email }).from(clients).innerJoin(users, eq(clients.userId, users.id)).where(eq(clients.therapistId, therapist.id)).orderBy(desc(clients.createdAt)).limit(5);

    return NextResponse.json({
      role: "therapist", therapistId: therapist.id,
      user: { id: user!.id, fullName: user!.fullName, email: user!.email, phone: user!.phone },
      clientCount: Number(clientCount?.count || 0),
      todaySessions: todayAppts, upcomingAppointments: upcomingAppts,
      unreadMessages: Number(unreadResult?.count || 0),
      recentClients,
      recentDocuments: recentDocs,
    });
  }

  if (user!.role === "admin") {
    const [totalClients] = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const [activeClients] = await db.select({ count: sql<number>`count(*)` }).from(clients).innerJoin(users, eq(clients.userId, users.id)).where(eq(users.active, true));
    const [totalTherapists] = await db.select({ count: sql<number>`count(*)` }).from(therapists);
    const [apptStats] = await db.select({
      upcoming: sql<number>`count(*) filter (where date >= ${today} and status in ('pending','confirmed','rescheduled'))`,
      completed: sql<number>`count(*) filter (where status = 'completed')`,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
    }).from(appointments);
    const [payStats] = await db.select({
      successful: sql<number>`count(*) filter (where status = 'successful')`,
      pendingPay: sql<number>`count(*) filter (where status = 'pending')`,
      revenue: sql<number>`coalesce(sum(amount_kes) filter (where status = 'successful'), 0)`,
    }).from(payments);

    return NextResponse.json({
      role: "admin",
      user: { id: user!.id, fullName: user!.fullName, email: user!.email },
      stats: {
        totalClients: Number(totalClients?.count || 0), activeClients: Number(activeClients?.count || 0), totalTherapists: Number(totalTherapists?.count || 0),
        upcomingAppointments: Number(apptStats?.upcoming || 0), completedAppointments: Number(apptStats?.completed || 0),
        pendingAppointments: Number(apptStats?.pending || 0), cancelledAppointments: Number(apptStats?.cancelled || 0),
        successfulPayments: Number(payStats?.successful || 0), pendingPayments: Number(payStats?.pendingPay || 0),
        revenue: Number(payStats?.revenue || 0),
      },
    });
  }

  return NextResponse.json({ error: "Unknown role" }, { status: 400 });
}
