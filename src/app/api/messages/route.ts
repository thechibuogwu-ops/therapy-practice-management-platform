import { NextResponse } from "next/server";

// Deprecated: use /api/portal/messages instead
export async function GET() {
  return NextResponse.json({ error: "Use /api/portal/messages" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "Use /api/portal/messages" }, { status: 410 });
}
