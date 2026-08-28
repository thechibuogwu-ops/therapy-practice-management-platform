import type { PoolClient } from "pg";
import { db, pool } from "@/db";
import { clients, conversations, therapists, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type AuthenticatedUser = { id: string; role: string; active: boolean };

export type CurrentConversation = {
  id: string;
  clientId: string;
  therapistId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getCurrentClient(userId: string) {
  const [client] = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
  return client || null;
}

export async function getCurrentActiveTherapist(userId: string) {
  const [therapist] = await db.select().from(therapists).where(and(eq(therapists.userId, userId), eq(therapists.active, true))).limit(1);
  return therapist || null;
}

export async function getCurrentAssignedClient(therapistUserId: string, clientId: string) {
  const therapist = await getCurrentActiveTherapist(therapistUserId);
  if (!therapist) return null;
  const [client] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.therapistId, therapist.id))).limit(1);
  if (!client) return null;
  return { therapist, client };
}

/** Returns a conversation only when it represents the caller's CURRENT care relationship. */
export async function authorizeCurrentConversation(user: AuthenticatedUser, conversationId: string): Promise<CurrentConversation | null> {
  if (user.role === "client") {
    const client = await getCurrentClient(user.id);
    if (!client) return null;
    const [conversation] = await db.select().from(conversations).where(and(
      eq(conversations.id, conversationId),
      eq(conversations.clientId, client.id),
      eq(conversations.therapistId, client.therapistId),
    )).limit(1);
    return conversation || null;
  }

  if (user.role === "therapist") {
    const therapist = await getCurrentActiveTherapist(user.id);
    if (!therapist) return null;
    const [conversation] = await db.select({
      id: conversations.id,
      clientId: conversations.clientId,
      therapistId: conversations.therapistId,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    }).from(conversations).innerJoin(clients, eq(conversations.clientId, clients.id)).where(and(
      eq(conversations.id, conversationId),
      eq(conversations.therapistId, therapist.id),
      eq(clients.therapistId, therapist.id),
    )).limit(1);
    return conversation || null;
  }

  return null;
}

/** Creates/reuses the unique active one-to-one conversation for a client. */
export async function ensureConversationForClient(user: AuthenticatedUser, requestedClientId?: string): Promise<CurrentConversation | null> {
  let clientId: string;
  let therapistId: string;

  if (user.role === "client") {
    const client = await getCurrentClient(user.id);
    if (!client) return null;
    clientId = client.id;
    therapistId = client.therapistId;
  } else if (user.role === "therapist") {
    const therapist = await getCurrentActiveTherapist(user.id);
    if (!therapist || !requestedClientId) return null;
    const [client] = await db.select().from(clients).where(and(eq(clients.id, requestedClientId), eq(clients.therapistId, therapist.id))).limit(1);
    if (!client) return null;
    clientId = client.id;
    therapistId = therapist.id;
  } else {
    return null;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO conversations (client_id, therapist_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (client_id, therapist_id)
       DO UPDATE SET updated_at = conversations.updated_at
       RETURNING id, client_id AS "clientId", therapist_id AS "therapistId", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [clientId, therapistId],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getConversationPartnerName(conversation: CurrentConversation, role: string) {
  if (role === "client") {
    const [row] = await db.select({ fullName: users.fullName }).from(therapists).innerJoin(users, eq(therapists.userId, users.id)).where(eq(therapists.id, conversation.therapistId)).limit(1);
    return row?.fullName || "Therapist";
  }
  const [row] = await db.select({ fullName: users.fullName }).from(clients).innerJoin(users, eq(clients.userId, users.id)).where(eq(clients.id, conversation.clientId)).limit(1);
  return row?.fullName || "Client";
}
