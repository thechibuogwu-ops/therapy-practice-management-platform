import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, documents, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { getCurrentActiveTherapist, getCurrentAssignedClient, getCurrentClient } from "@/lib/private-care";
import { deleteFile, saveBuffer, validateFile } from "@/lib/storage";
import { checkRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";

const ALLOWED_CATEGORIES = new Set(["general", "forms", "reports", "other"]);

function pagination(params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(params.get("limit") || "20")));
  return { page, limit, offset: (page - 1) * limit };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = pagination(searchParams);

  if (user.role === "client") {
    const client = await getCurrentClient(user.id);
    if (!client) return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    const [rows, count] = await Promise.all([
      db.select({ id: documents.id, fileName: documents.fileName, fileSize: documents.fileSize, mimeType: documents.mimeType, category: documents.category, createdAt: documents.createdAt, uploadedBy: documents.uploadedBy, uploaderName: users.fullName })
        .from(documents).leftJoin(users, eq(documents.uploadedBy, users.id)).where(eq(documents.clientId, client.id)).orderBy(sql`${documents.createdAt} DESC`).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(documents).where(eq(documents.clientId, client.id)),
    ]);
    return NextResponse.json({ documents: rows, page, limit, total: Number(count[0]?.count || 0) });
  }

  const therapist = await getCurrentActiveTherapist(user.id);
  if (!therapist) return NextResponse.json({ error: "Therapist record not found" }, { status: 404 });
  const requestedClientId = searchParams.get("clientId") || "";
  if (requestedClientId) {
    const relationship = await getCurrentAssignedClient(user.id, requestedClientId);
    if (!relationship) return NextResponse.json({ error: "Client not found or unauthorized" }, { status: 403 });
  }
  const clientCondition = requestedClientId ? sql`AND c.id = ${requestedClientId}` : sql``;
  const rows = await db.execute(sql`
    SELECT d.id, d.file_name AS "fileName", d.file_size AS "fileSize", d.mime_type AS "mimeType", d.category, d.created_at AS "createdAt", d.uploaded_by AS "uploadedBy", c.id AS "clientId", cu.full_name AS "clientName", uu.full_name AS "uploaderName"
    FROM documents d
    INNER JOIN clients c ON d.client_id = c.id
    INNER JOIN users cu ON c.user_id = cu.id
    LEFT JOIN users uu ON d.uploaded_by = uu.id
    WHERE c.therapist_id = ${therapist.id} ${clientCondition}
    ORDER BY d.created_at DESC LIMIT ${limit} OFFSET ${offset}
  `);
  const count = await db.execute(sql`SELECT count(*) FROM documents d INNER JOIN clients c ON d.client_id=c.id WHERE c.therapist_id=${therapist.id} ${clientCondition}`);
  return NextResponse.json({ documents: rows.rows, page, limit, total: Number(count.rows[0]?.count || 0), clientId: requestedClientId || null });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientRateLimitKey(req, "document-upload"), 20, 15 * 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many upload attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") instanceof File ? formData.get("file") as File : null;
  const category = typeof formData.get("category") === "string" ? formData.get("category") as string : "general";
  const clientIdParam = typeof formData.get("clientId") === "string" ? formData.get("clientId") as string : "";
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!ALLOWED_CATEGORIES.has(category)) return NextResponse.json({ error: "Invalid document category." }, { status: 400 });
  const validated = await validateFile(file);
  if (validated.error || !validated.buffer) return NextResponse.json({ error: validated.error || "Invalid file." }, { status: 400 });

  let clientId: string;
  let therapistId: string;
  if (user.role === "client") {
    const client = await getCurrentClient(user.id);
    if (!client) return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    clientId = client.id;
    therapistId = client.therapistId;
  } else {
    const therapist = await getCurrentActiveTherapist(user.id);
    if (!therapist) return NextResponse.json({ error: "Therapist record not found" }, { status: 404 });
    if (!clientIdParam) return NextResponse.json({ error: "Client is required." }, { status: 400 });
    const [client] = await db.select().from(clients).where(and(eq(clients.id, clientIdParam), eq(clients.therapistId, therapist.id))).limit(1);
    if (!client) return NextResponse.json({ error: "Client not found or unauthorized." }, { status: 403 });
    clientId = client.id;
    therapistId = therapist.id;
  }

  let stored: Awaited<ReturnType<typeof saveBuffer>> | null = null;
  try {
      stored = await saveBuffer(validated.buffer, file.type, "documents");
    const [document] = await db.insert(documents).values({
      clientId,
      therapistId,
      uploadedBy: user.id,
      category,
      fileName: file.name,
      filePath: stored.filePath,
      fileSize: stored.size,
      mimeType: stored.mime,
    }).returning();
    return NextResponse.json({ document: { id: document.id, fileName: document.fileName, fileSize: document.fileSize, mimeType: document.mimeType, category: document.category, createdAt: document.createdAt } }, { status: 201 });
  } catch (e) {
      if (stored) await deleteFile(stored.filePath);
    console.error("Document upload persistence failed");
    return NextResponse.json({ error: "Document could not be saved." }, { status: 500 });
  }
}
