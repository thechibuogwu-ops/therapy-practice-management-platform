import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { services } from "@/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

function validate(input: any) {
  const name = String(input.name || "").trim();
  const durationMinutes = Number(input.durationMinutes);
  const priceKES = Number(input.priceKES);
  if (!name) return { error: "Service name is required." };
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) return { error: "Duration must be a positive number of minutes." };
  if (!Number.isFinite(priceKES) || priceKES < 0 || !Number.isInteger(priceKES)) return { error: "Price must be a valid non-negative KES amount." };
  return { name, durationMinutes, priceKES, description: input.description ? String(input.description).trim() : null, active: input.active !== false };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const search = searchParams.get("search")?.trim() || "";
  const active = searchParams.get("active");
  const conditions = [];
  if (search) conditions.push(ilike(services.name, `%${search}%`));
  if (active === "true" || active === "false") conditions.push(eq(services.active, active === "true"));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(services).where(where).orderBy(services.name).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(services).where(where),
  ]);
  return NextResponse.json({ services: rows, page, limit, total: Number(totalRows[0]?.count || 0) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const validated = validate(await req.json());
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
  const [row] = await db.insert(services).values(validated).returning();
  await writeAuditLog({ actorUserId: user!.id, action: "service.created", entityType: "service", entityId: row.id, metadata: { name: row.name, durationMinutes: row.durationMinutes, priceKES: row.priceKES } });
  return NextResponse.json({ service: row }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth("admin");
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Service id is required." }, { status: 400 });
  const validated = validate(body);
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
  const [existing] = await db.select({ id: services.id }).from(services).where(eq(services.id, body.id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Service not found." }, { status: 404 });
  const [row] = await db.update(services).set(validated).where(eq(services.id, body.id)).returning();
  await writeAuditLog({ actorUserId: user!.id, action: row.active ? "service.updated" : "service.deactivated", entityType: "service", entityId: row.id, metadata: { name: row.name, durationMinutes: row.durationMinutes, priceKES: row.priceKES, active: row.active } });
  return NextResponse.json({ service: row });
}
