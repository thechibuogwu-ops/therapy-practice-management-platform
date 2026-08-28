import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db.select().from(services).where(eq(services.active, true));
    return NextResponse.json({ services: rows });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to load services" }, { status: 500 });
  }
}
