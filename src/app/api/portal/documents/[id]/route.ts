import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { getCurrentActiveTherapist, getCurrentClient } from "@/lib/private-care";
import { getFileBuffer, safeDownloadName } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (user.role === "client") {
    const client = await getCurrentClient(user.id);
    if (!client || document.clientId !== client.id) return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 403 });
  } else {
    const therapist = await getCurrentActiveTherapist(user.id);
    if (!therapist) return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 403 });
    const [currentClient] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, document.clientId), eq(clients.therapistId, therapist.id))).limit(1);
    if (!currentClient) return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 403 });
  }

  const buffer = await getFileBuffer(document.filePath);
  if (!buffer) return NextResponse.json({ error: "Document file is unavailable." }, { status: 404 });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${safeDownloadName(document.fileName)}"`,
      "Content-Length": String(buffer.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
