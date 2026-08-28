import { NextResponse } from "next/server";
import { seed } from "@/lib/seed";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await seed();
    return NextResponse.json({ ok: true, message: "Demo data seeded" });
  } catch {
    console.error("Development seed failed");
    return NextResponse.json({ error: "Demo seed failed" }, { status: 500 });
  }
}
