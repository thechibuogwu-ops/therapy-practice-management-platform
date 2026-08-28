import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { practiceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const rows = await db.select().from(practiceSettings).limit(1);
  return NextResponse.json({ settings: rows[0] || null });
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const body = await req.json();
  const payload = {
    name: String(body.name || "").trim(),
    email: body.email ? String(body.email).trim().toLowerCase() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    address: body.address ? String(body.address).trim() : null,
    currency: body.currency || "KES",
    timezone: body.timezone || "Africa/Nairobi",
    updatedAt: new Date(),
  };
  if (!payload.name) return NextResponse.json({ error: "Practice name is required." }, { status: 400 });
  if (payload.currency !== "KES") return NextResponse.json({ error: "Currency must be KES for this practice." }, { status: 400 });
  if (payload.timezone !== "Africa/Nairobi") return NextResponse.json({ error: "Timezone must remain Africa/Nairobi to preserve existing appointment times." }, { status: 400 });
  const rows = await db.select().from(practiceSettings).limit(1);
  const [saved] = rows.length > 0
    ? await db.update(practiceSettings).set(payload).where(eq(practiceSettings.id, rows[0].id)).returning()
    : await db.insert(practiceSettings).values(payload).returning();
  await writeAuditLog({ actorUserId: user!.id, action: "settings.updated", entityType: "practice_settings", entityId: saved.id, metadata: { name: saved.name, currency: saved.currency, timezone: saved.timezone } });
  return NextResponse.json({ settings: saved });
}
