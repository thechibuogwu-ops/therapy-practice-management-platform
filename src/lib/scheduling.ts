/**
 * Centralised scheduling engine.
 * All stored appointment dates/times are Africa/Nairobi wall-clock values:
 * date = YYYY-MM-DD, time = HH:MM. They are never converted to UTC instants.
 */

import type { PoolClient } from "pg";
import { db } from "@/db";
import { availability, appointments, services, therapists, timeoff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getDateOnlyDayOfWeek, getNairobiCurrentMinutes, getNairobiToday, parseDateOnly, PRACTICE_TIMEZONE } from "@/lib/practice-time";

export { PRACTICE_TIMEZONE };

export function parseTime(t: string): number {
  if (!/^\d{2}:\d{2}$/.test(t)) return Number.NaN;
  const [h, m] = t.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return Number.NaN;
  return h * 60 + m;
}

export function formatTime(mins: number): string {
  return `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;
}

const BLOCKING_STATUSES = new Set(["pending", "confirmed", "rescheduled"]);
function isBlocking(status: string | null): boolean { return BLOCKING_STATUSES.has(status || ""); }
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function getAvailableSlots(therapistId: string, dateStr: string, serviceId: string) {
  try { parseDateOnly(dateStr); } catch { return { slots: [], error: "Invalid date" }; }
  if (dateStr < getNairobiToday()) return { slots: [], message: "This date is no longer available" };

  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service || !service.active) return { slots: [], error: "Service not found or inactive" };
  const duration = service.durationMinutes;

  const [therapist] = await db.select().from(therapists).where(eq(therapists.id, therapistId)).limit(1);
  if (!therapist || !therapist.active) return { slots: [], error: "Therapist not available" };

  const dayOfWeek = getDateOnlyDayOfWeek(dateStr);
  const avail = await db.select().from(availability)
    .where(and(eq(availability.therapistId, therapistId), eq(availability.dayOfWeek, dayOfWeek)));
  if (avail.length === 0) return { slots: [], message: "Therapist is not available on this day" };

  const timeoffBlocks = await db.select().from(timeoff)
    .where(and(eq(timeoff.therapistId, therapistId), eq(timeoff.date, dateStr)));
  const existingAppts = await db.select().from(appointments)
    .where(and(eq(appointments.therapistId, therapistId), eq(appointments.date, dateStr)));

  const bookedIntervals = existingAppts
    .filter((a) => isBlocking(a.status))
    .map((a) => ({ start: parseTime(a.startTime), end: parseTime(a.endTime) }));
  const blockedIntervals = timeoffBlocks
    .map((b) => ({ start: parseTime(b.startTime), end: parseTime(b.endTime) }));

  const uniqueSlots = new Map<string, { startTime: string; endTime: string }>();
  for (const block of avail) {
    const blockStart = parseTime(block.startTime);
    const blockEnd = parseTime(block.endTime);
    if (!Number.isFinite(blockStart) || !Number.isFinite(blockEnd) || blockEnd <= blockStart) continue;

    for (let cursor = blockStart; cursor + duration <= blockEnd; cursor += 30) {
      const slotEnd = cursor + duration;
      const collidesWithAppointment = bookedIntervals.some((b) => overlaps(cursor, slotEnd, b.start, b.end));
      const collidesWithTimeoff = blockedIntervals.some((b) => overlaps(cursor, slotEnd, b.start, b.end));
      if (!collidesWithAppointment && !collidesWithTimeoff) {
        const startTime = formatTime(cursor);
        uniqueSlots.set(startTime, { startTime, endTime: formatTime(slotEnd) });
      }
    }
  }

  return { slots: [...uniqueSlots.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)), duration, service };
}

export interface BookingParams {
  therapistId: string;
  serviceId: string;
  date: string;
  startTime: string;
  excludeAppointmentId?: string;
}

export interface BookingValidation {
  ok: boolean;
  error?: string;
  endTime?: string;
  service?: { name: string; priceKES: number; durationMinutes: number };
}

/**
 * Performs final schedule validation on the SAME PostgreSQL transaction client
 * that will insert/update the appointment.
 *
 * pg_advisory_xact_lock serializes all schedule writes for one therapist/date,
 * including currently empty time slots. The lock is released automatically on
 * COMMIT/ROLLBACK. Existing active appointment rows are also locked for clarity.
 */
export async function validateAndLockSlot(client: PoolClient, params: BookingParams): Promise<BookingValidation> {
  const { therapistId, serviceId, date, startTime, excludeAppointmentId = null } = params;

  try { parseDateOnly(date); } catch { return { ok: false, error: "Invalid date" }; }
  const startMin = parseTime(startTime);
  if (!Number.isFinite(startMin)) return { ok: false, error: "Invalid start time" };
  const nairobiToday = getNairobiToday();
  if (date < nairobiToday || (date === nairobiToday && startMin < getNairobiCurrentMinutes())) {
    return { ok: false, error: "Requested time is in the past" };
  }

  // Must be called after BEGIN. These two stable lock keys serialize ALL writers
  // for the same therapist and date, including an empty schedule.
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
    [therapistId, date]
  );

  const serviceResult = await client.query(
    "SELECT id, name, duration_minutes, price_kes, active FROM services WHERE id = $1",
    [serviceId]
  );
  const service = serviceResult.rows[0];
  if (!service || !service.active) return { ok: false, error: "Service not found or inactive" };

  const durationMinutes = Number(service.duration_minutes);
  const endMin = startMin + durationMinutes;
  if (endMin > 24 * 60) return { ok: false, error: "Requested time is invalid" };
  const endTime = formatTime(endMin);

  const therapistResult = await client.query("SELECT id, active FROM therapists WHERE id = $1", [therapistId]);
  if (!therapistResult.rows[0] || !therapistResult.rows[0].active) return { ok: false, error: "Therapist not available" };

  const dayOfWeek = getDateOnlyDayOfWeek(date);
  const availResult = await client.query(
    "SELECT start_time, end_time FROM availability WHERE therapist_id = $1 AND day_of_week = $2",
    [therapistId, dayOfWeek]
  );
  if (availResult.rows.length === 0) return { ok: false, error: "Therapist is not available on this day" };

  const inBlock = availResult.rows.some((a: any) => {
    const availableStart = parseTime(a.start_time);
    const availableEnd = parseTime(a.end_time);
    return startMin >= availableStart && endMin <= availableEnd;
  });
  if (!inBlock) return { ok: false, error: "Selected time is outside therapist working hours" };

  const timeoffResult = await client.query(
    "SELECT start_time, end_time FROM timeoff WHERE therapist_id = $1 AND date = $2",
    [therapistId, date]
  );
  const blocked = timeoffResult.rows.some((block: any) =>
    overlaps(startMin, endMin, parseTime(block.start_time), parseTime(block.end_time))
  );
  if (blocked) return { ok: false, error: "Therapist is unavailable during this period" };

  // The transaction-scoped advisory lock above is the concurrency authority for
  // this therapist/date (including empty schedules). A plain scoped read avoids
  // cross-date reschedule deadlocks while the advisory lock serializes writers.
  const appointmentsResult = await client.query(
    `SELECT id, start_time, end_time
       FROM appointments
      WHERE therapist_id = $1 AND date = $2
        AND status IN ('pending', 'confirmed', 'rescheduled')
        AND ($3::uuid IS NULL OR id <> $3::uuid)`, 
    [therapistId, date, excludeAppointmentId]
  );

  const conflict = appointmentsResult.rows.some((row: any) =>
    overlaps(startMin, endMin, parseTime(row.start_time), parseTime(row.end_time))
  );
  if (conflict) return { ok: false, error: "This time slot is no longer available. Please choose another time." };

  return {
    ok: true,
    endTime,
    service: { name: service.name, priceKES: Number(service.price_kes), durationMinutes },
  };
}
