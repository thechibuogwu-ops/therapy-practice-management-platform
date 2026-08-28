import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, conversations, messageAttachments, messages, users } from "@/db/schema";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { authorizeCurrentConversation, getCurrentActiveTherapist, getCurrentClient, getConversationPartnerName } from "@/lib/private-care";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = Math.max(1, Number(process.env.MAX_MESSAGE_LENGTH || "4000"));
const MESSAGE_PAGE_SIZE = 50;

async function messagesWithAttachments(messageRows: any[]) {
  if (!messageRows.length) return [];
  const attachments = await db.select({
    id: messageAttachments.id,
    messageId: messageAttachments.messageId,
    fileName: messageAttachments.fileName,
    fileSize: messageAttachments.fileSize,
    mimeType: messageAttachments.mimeType,
  }).from(messageAttachments).where(inArray(messageAttachments.messageId, messageRows.map((message) => message.id)));
  const byMessage = new Map<string, any[]>();
  attachments.forEach((attachment) => byMessage.set(attachment.messageId, [...(byMessage.get(attachment.messageId) || []), attachment]));
  return messageRows.map((message) => ({ ...message, attachments: byMessage.get(message.id) || [] }));
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    const conversation = await authorizeCurrentConversation(user, conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 403 });

    const before = searchParams.get("before");
    const beforeDate = before ? new Date(before) : null;
    if (before && (!beforeDate || Number.isNaN(beforeDate.getTime()))) return NextResponse.json({ error: "Invalid message cursor" }, { status: 400 });

    const query = db.select({
      id: messages.id,
      body: messages.body,
      senderId: messages.senderId,
      read: messages.read,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    }).from(messages).where(beforeDate
      ? and(eq(messages.conversationId, conversationId), lt(messages.createdAt, beforeDate))
      : eq(messages.conversationId, conversationId),
    ).orderBy(desc(messages.createdAt)).limit(MESSAGE_PAGE_SIZE + 1);

    const descendingRows = await query;
    const hasMore = descendingRows.length > MESSAGE_PAGE_SIZE;
    const pageRows = (hasMore ? descendingRows.slice(0, MESSAGE_PAGE_SIZE) : descendingRows).reverse();

    await db.update(messages).set({ read: true, readAt: new Date() }).where(and(
      eq(messages.conversationId, conversationId),
      eq(messages.read, false),
      sql`${messages.senderId} <> ${user.id}`,
    ));

    return NextResponse.json({
      conversation: { ...conversation, partnerName: await getConversationPartnerName(conversation, user.role) },
      messages: await messagesWithAttachments(pageRows),
      nextCursor: hasMore ? pageRows[0]?.createdAt?.toISOString() || null : null,
      hasMore,
    });
  }

  if (user.role === "client") {
    const client = await getCurrentClient(user.id);
    if (!client) return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    const rows = await db.execute(sql`
      SELECT cv.id, cv.client_id AS "clientId", cv.therapist_id AS "therapistId", cv.created_at AS "createdAt", cv.updated_at AS "updatedAt",
             tu.full_name AS "therapistName",
             COALESCE((SELECT count(*) FROM messages m WHERE m.conversation_id=cv.id AND m.read=false AND m.sender_id<>${user.id}), 0) AS "unreadCount"
      FROM conversations cv
      INNER JOIN therapists t ON cv.therapist_id=t.id
      INNER JOIN users tu ON t.user_id=tu.id
      WHERE cv.client_id=${client.id} AND cv.therapist_id=${client.therapistId}
      ORDER BY cv.updated_at DESC LIMIT 1
    `);
    return NextResponse.json({ conversations: rows.rows });
  }

  const therapist = await getCurrentActiveTherapist(user.id);
  if (!therapist) return NextResponse.json({ error: "Therapist record not found" }, { status: 404 });
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;
  const rows = await db.execute(sql`
    SELECT c.id AS "clientId", u.full_name AS "clientName", cv.id, cv.created_at AS "createdAt", cv.updated_at AS "updatedAt",
           COALESCE((SELECT count(*) FROM messages m WHERE m.conversation_id=cv.id AND m.read=false AND m.sender_id<>${user.id}), 0) AS "unreadCount"
    FROM clients c
    INNER JOIN users u ON c.user_id=u.id
    LEFT JOIN conversations cv ON cv.client_id=c.id AND cv.therapist_id=${therapist.id}
    WHERE c.therapist_id=${therapist.id}
    ORDER BY COALESCE(cv.updated_at, c.created_at) DESC, u.full_name ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return NextResponse.json({ conversations: rows.rows, page, limit });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "message-send"), 60, 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many messages. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { conversationId, body } = await req.json();
  const plainText = typeof body === "string" ? body.trim() : "";
  if (!conversationId || !plainText) return NextResponse.json({ error: "A message is required." }, { status: 400 });
  if (plainText.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });

  const conversation = await authorizeCurrentConversation(user, conversationId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 403 });

  const [message] = await db.insert(messages).values({
    conversationId: conversation.id,
    senderId: user.id,
    body: plainText,
    read: false,
  }).returning();
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversation.id));
  return NextResponse.json({ message: { ...message, attachments: [] } }, { status: 201 });
}
