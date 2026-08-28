import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth-utils";
import { getCurrentAssignedClient } from "@/lib/private-care";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth("therapist");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { id: clientId } = await params;
  const relationship = await getCurrentAssignedClient(user!.id, clientId);
  if (!relationship) return NextResponse.json({ error: "Client not found or unauthorized" }, { status: 403 });

  const client = await pool.connect();
  try {
    const [overview, appointments, documents, recentMessages, activity] = await Promise.all([
      client.query(
        `SELECT c.id, c.created_at AS "createdAt", u.full_name AS "fullName", u.email, u.phone, u.active, u.verified,
          (SELECT count(*) FROM appointments a WHERE a.client_id=c.id) AS "appointmentCount",
          (SELECT count(*) FROM documents d WHERE d.client_id=c.id) AS "documentCount",
          (SELECT count(*) FROM messages m INNER JOIN conversations cv ON m.conversation_id=cv.id WHERE cv.client_id=c.id AND cv.therapist_id=$2 AND m.read=false AND m.sender_id<>$1) AS "unreadMessages"
         FROM clients c INNER JOIN users u ON c.user_id=u.id WHERE c.id=$3 AND c.therapist_id=$2`,
        [user!.id, relationship.therapist.id, relationship.client.id],
      ),
      client.query(
        `SELECT a.id, a.date, a.start_time AS "startTime", a.end_time AS "endTime", a.status, a.payment_status AS "paymentStatus", s.name AS "serviceName"
         FROM appointments a LEFT JOIN services s ON a.service_id=s.id
         WHERE a.client_id=$1 AND a.therapist_id=$2 ORDER BY a.date DESC, a.start_time DESC LIMIT 50`,
        [relationship.client.id, relationship.therapist.id],
      ),
      client.query(
        `SELECT d.id, d.file_name AS "fileName", d.file_size AS "fileSize", d.mime_type AS "mimeType", d.category, d.created_at AS "createdAt", u.full_name AS "uploadedByName"
         FROM documents d LEFT JOIN users u ON d.uploaded_by=u.id
         WHERE d.client_id=$1 ORDER BY d.created_at DESC LIMIT 10`,
        [relationship.client.id],
      ),
      client.query(
        `SELECT m.id, m.created_at AS "createdAt", m.read, m.sender_id AS "senderId"
         FROM messages m INNER JOIN conversations cv ON m.conversation_id=cv.id
         WHERE cv.client_id=$1 AND cv.therapist_id=$2 ORDER BY m.created_at DESC LIMIT 10`,
        [relationship.client.id, relationship.therapist.id],
      ),
      client.query(
        `SELECT * FROM (
          SELECT a.created_at AS "createdAt", 'appointment' AS type, a.status AS label, a.date AS "eventDate" FROM appointments a WHERE a.client_id=$1 AND a.therapist_id=$2
          UNION ALL
          SELECT d.created_at AS "createdAt", 'document' AS type, d.category AS label, NULL AS "eventDate" FROM documents d WHERE d.client_id=$1
          UNION ALL
          SELECT m.created_at AS "createdAt", 'message' AS type, CASE WHEN m.sender_id=$3 THEN 'Therapist message' ELSE 'Client message' END AS label, NULL AS "eventDate" FROM messages m INNER JOIN conversations cv ON m.conversation_id=cv.id WHERE cv.client_id=$1 AND cv.therapist_id=$2
        ) events ORDER BY "createdAt" DESC LIMIT 20`,
        [relationship.client.id, relationship.therapist.id, user!.id],
      ),
    ]);
    if (!overview.rows[0]) return NextResponse.json({ error: "Client not found or unauthorized" }, { status: 403 });
    return NextResponse.json({
      client: overview.rows[0],
      appointments: appointments.rows,
      documents: documents.rows,
      recentMessages: recentMessages.rows,
      activity: activity.rows,
    });
  } finally {
    client.release();
  }
}
