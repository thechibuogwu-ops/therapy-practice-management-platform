import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messageAttachments, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { authorizeCurrentConversation } from "@/lib/private-care";
import { getFileBuffer, safeDownloadName } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const [attachment] = await db.select().from(messageAttachments).where(eq(messageAttachments.id, id)).limit(1);
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  const [message] = await db.select({ conversationId: messages.conversationId }).from(messages).where(eq(messages.id, attachment.messageId)).limit(1);
  if (!message) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  const conversation = await authorizeCurrentConversation(user, message.conversationId);
  if (!conversation) return NextResponse.json({ error: "Attachment not found or unauthorized" }, { status: 403 });

  const buffer = await getFileBuffer(attachment.filePath);
  if (!buffer) return NextResponse.json({ error: "Attachment file is unavailable." }, { status: 404 });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${safeDownloadName(attachment.fileName)}"`,
      "Content-Length": String(buffer.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
