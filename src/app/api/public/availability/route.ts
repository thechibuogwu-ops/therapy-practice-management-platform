import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/scheduling";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const therapistId = searchParams.get("therapistId");
    const date = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!therapistId || !date || !serviceId) {
      return NextResponse.json({ error: "therapistId, date and serviceId are required" }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }

    const result = await getAvailableSlots(therapistId, date, serviceId);

    if (result.error) {
      return NextResponse.json({ slots: [], error: result.error });
    }

    return NextResponse.json({
      slots: result.slots,
      date,
      therapistId,
      serviceId,
      durationMinutes: result.duration,
      message: result.message || undefined,
    });
  } catch (e: any) {
    console.error("Availability error:", e);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
