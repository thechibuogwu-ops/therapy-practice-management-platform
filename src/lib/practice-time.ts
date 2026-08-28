/** Practice calendar utilities. All appointment date-only values are interpreted
 * as Africa/Nairobi calendar dates, never as instants in UTC. */

export const PRACTICE_TIMEZONE = "Africa/Nairobi";

export type CalendarDate = { year: number; month: number; day: number };

export function parseDateOnly(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid date format");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) throw new Error("Invalid date value");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day > daysInMonth) throw new Error("Invalid date value");
  return { year, month, day };
}

export function formatDateOnly(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** Current calendar date in the practice timezone. */
export function getNairobiToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRACTICE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getNairobiCurrentMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PRACTICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
  return get("hour") * 60 + get("minute");
}

/** Gregorian calendar weekday for a date-only value: 0 Sunday through 6 Saturday.
 * This is pure arithmetic; it does not create a timezone-dependent Date object. */
export function getDateOnlyDayOfWeek(value: string): number {
  const { year: originalYear, month, day } = parseDateOnly(value);
  let year = originalYear;
  const table = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (month < 3) year -= 1;
  return (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + table[month - 1] + day) % 7;
}

/** Add calendar days to a date-only value. Uses UTC only for Gregorian arithmetic,
 * then returns explicit date components without serializing an instant for display. */
export function addCalendarDays(value: string, amount: number): string {
  const { year, month, day } = parseDateOnly(value);
  const result = new Date(Date.UTC(year, month - 1, day + amount, 12, 0, 0));
  return formatDateOnly({ year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() });
}

export function addCalendarMonths(value: string, amount: number): string {
  const { year, month, day } = parseDateOnly(value);
  const result = new Date(Date.UTC(year, month - 1 + amount, day, 12, 0, 0));
  return formatDateOnly({ year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() });
}

export function startOfMonth(value: string): string {
  const { year, month } = parseDateOnly(value);
  return formatDateOnly({ year, month, day: 1 });
}

export function endOfMonth(value: string): string {
  const { year, month } = parseDateOnly(value);
  const result = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  return formatDateOnly({ year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() });
}

export function getDateParts(value: string): CalendarDate {
  return parseDateOnly(value);
}

/** Display a date-only practice date without parsing it as browser-local time. */
export function formatPracticeDate(value: string, options: Intl.DateTimeFormatOptions): string {
  const { year, month, day } = parseDateOnly(value);
  // Use noon UTC merely as a stable representation of supplied date components.
  // Always format in Nairobi so it renders the same practice calendar date worldwide.
  return new Intl.DateTimeFormat("en-KE", { timeZone: PRACTICE_TIMEZONE, ...options }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}
