import { NextResponse } from "next/server";

// Accounts are created only by authorized administrators and activated by invitation.
export async function POST() {
  return NextResponse.json({ error: "Public registration is not available. Please contact the practice." }, { status: 403 });
}
