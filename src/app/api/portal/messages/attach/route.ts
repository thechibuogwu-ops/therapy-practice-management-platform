import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth-utils";
import { authorizeCurrentConversation } from "@/lib/private-care";
import { deleteFile, saveBuffer, validateFile } from "@/lib/storage";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = Math.max(1, Number(process.env.MAX_MESSAGE_LENGTH || "4000"));

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "message-attachment"), 20, 15 * 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many upload attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") instanceof File ? formData.get("file") as File : null;
  const conversationId = typeof formData.get("conversationId") === "string" ? formData.get("conversationId") as string : "";
  const body = typeof formData.get("body") === "string" ? (formData.get("body") as string).trim() : "";
  if (!conversationId) return NextResponse.json({ error: "Conversation is required." }, { status: 400 });
  if (!file && !body) return NextResponse.json({ error: "A message or attachment is required." }, { status: 400 });
  if (body.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });

  const conversation = await authorizeCurrentConversation(user, conversationId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 403 });

  let stored: Awaited<ReturnType<typeof saveBuffer>> | null = null;
  if (file) {
    const validated = await validateFile(file);
    if (validated.error || !validated.buffer) return NextResponse.json({ error: validated.error || "Invalid attachment." }, { status: 400 });
    try { stored = await saveBuffer(validated.buffer, file.type, "attachments"); }
    catch { return NextResponse.json({ error: "Attachment could not be stored." }, { status: 500 }); }
  }

  let client: import("pg").PoolClient | null = null;
  try {
    const tx = await pool.connect();
    client = tx;
    await tx.query("BEGIN");
    const messageResult = await tx.query(
      `INSERT INTO messages (conversation_id, sender_id, body, read, created_at)
       VALUES ($1, $2, $3, false, NOW())
       RETURNING id, conversation_id AS "conversationId", sender_id AS "senderId", body, read, read_at AS "readAt", created_at AS "createdAt"`,
      [conversation.id, user.id, body || `Shared a document: ${file!.name}`],
    );
    const message = messageResult.rows[0];
    let attachment = null;
    if (stored && file) {
      const attachmentResult = await tx.query(
        `INSERT INTO message_attachments (message_id, file_name, file_path, file_size, mime_type, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, file_name AS "fileName", file_size AS "fileSize", mime_type AS "mimeType"`,
        [message.id, file.name, stored.filePath, stored.size, stored.mime],
      );
      attachment = attachmentResult.rows[0];
    }
    await tx.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversation.id]);
    await tx.query("COMMIT");
    return NextResponse.json({ message: { ...message, attachments: attachment ? [attachment] : [] } }, { status: 201 });
  } catch (e) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (stored) await deleteFile(stored.filePath);
    console.error("Message attachment persistence failed");
    return NextResponse.json({ error: "Attachment could not be saved." }, { status: 500 });
  } finally {
    client?.release();
  }
}
