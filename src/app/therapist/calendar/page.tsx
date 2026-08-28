"use client";
import { useState, useEffect, useMemo } from "react";
import { usePortal } from "@/lib/usePortal";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addCalendarDays,
  addCalendarMonths,
  formatPracticeDate,
  getDateOnlyDayOfWeek,
  getDateParts,
  getNairobiToday,
  startOfMonth,
} from "@/lib/practice-time";

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  rescheduled: "bg-purple-100 text-purple-800 border-purple-200",
  "no-show": "bg-gray-100 text-gray-600 border-gray-200",
};

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m.toString().padStart(2, "0")} ${ap}`;
}

export default function TherapistCalendar() {
  const { data, loading: authLoading } = usePortal("therapist");
  const [view, setView] = useState<"month" | "week" | "day">("month");
  // Explicit Africa/Nairobi date-only value, never a browser-local Date instant.
  const [current, setCurrent] = useState(getNairobiToday);
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { from, to } = useMemo(() => {
    if (view === "month") {
      const first = startOfMonth(current);
      const gridStart = addCalendarDays(first, -getDateOnlyDayOfWeek(first));
      return { from: gridStart, to: addCalendarDays(gridStart, 41) };
    }
    if (view === "week") {
      const weekStart = addCalendarDays(current, -getDateOnlyDayOfWeek(current));
      return { from: weekStart, to: addCalendarDays(weekStart, 6) };
    }
    return { from: current, to: current };
  }, [current, view]);

  useEffect(() => {
    if (!data) return;
    setLoading(true);
    fetch(`/api/portal/appointments?from=${from}&to=${to}&limit=500`)
      .then((r) => r.json())
      .then((d) => { setAppts(d.appointments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [data, from, to]);

  function navigate(dir: number) {
    setCurrent((prev) => {
      if (view === "month") return addCalendarMonths(startOfMonth(prev), dir);
      return addCalendarDays(prev, view === "week" ? dir * 7 : dir);
    });
  }

  const todayStr = getNairobiToday();
  const apptsByDate: Record<string, any[]> = {};
  appts.forEach((a) => { (apptsByDate[a.date] ||= []).push(a); });

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    return Array.from({ length: 42 }, (_, i) => addCalendarDays(from, i));
  }, [from, view]);

  const weekDays = useMemo(() => {
    if (view !== "week") return [];
    return Array.from({ length: 7 }, (_, i) => addCalendarDays(from, i));
  }, [from, view]);

  const parts = getDateParts(current);
  const title = view === "month"
    ? `${MONTH_NAMES[parts.month - 1]} ${parts.year}`
    : view === "week"
      ? `Week of ${formatPracticeDate(from, { year: "numeric", month: "short", day: "numeric" })}`
      : formatPracticeDate(current, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (authLoading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;

  return (
    <div className="px-4 md:px-10 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl font-medium text-[#1a3325]">Calendar</h1>
        <div className="flex items-center gap-2">
          {(["month", "week", "day"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${view === v ? "bg-[#1a3325] text-white" : "bg-[#eceae6] text-[#5a554d] hover:bg-[#ddd8cf]"}`}>{v}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#eceae6] transition" aria-label="Previous period"><ChevronLeft size={20} className="text-[#1a3325]" /></button>
        <div className="text-center">
          <p className="font-medium text-[#1a3325]">{title}</p>
          <button onClick={() => setCurrent(getNairobiToday())} className="text-xs text-[#8a7e6a] hover:text-[#1a3325] transition">Today</button>
        </div>
        <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-[#eceae6] transition" aria-label="Next period"><ChevronRight size={20} className="text-[#1a3325]" /></button>
      </div>

      {loading && <p className="text-center text-[#8a7e6a] py-4">Loading…</p>}

      {view === "month" && (
        <div className="bg-white border border-[#e5e0d6] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#e5e0d6]">
            {DAY_NAMES_SHORT.map((d) => <div key={d} className="py-2 text-center text-xs font-bold uppercase text-[#8a7e6a]">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((date, i) => {
              const dateParts = getDateParts(date);
              const isCurrentMonth = dateParts.month === parts.month && dateParts.year === parts.year;
              const isToday = date === todayStr;
              const dayAppts = apptsByDate[date] || [];
              return (
                <button key={i} type="button" className={`min-h-[80px] md:min-h-[100px] border-b border-r border-[#eceae6] p-1 text-left ${!isCurrentMonth ? "bg-[#f8f6f2]/50" : ""} ${isToday ? "bg-amber-50/50" : ""}`}
                  onClick={() => { setCurrent(date); setView("day"); }}>
                  <p className={`text-xs font-medium mb-1 px-1 ${isToday ? "text-[#1a3325] font-bold" : isCurrentMonth ? "text-[#3d3830]" : "text-[#c4bfb4]"}`}>{dateParts.day}</p>
                  {dayAppts.slice(0, 2).map((a) => <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate border ${STATUS_COLORS[a.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{fmtTime(a.startTime)} {a.clientName}</div>)}
                  {dayAppts.length > 2 && <p className="text-[9px] text-[#8a7e6a] px-1">+{dayAppts.length - 2} more</p>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && <div className="space-y-3">
        {weekDays.map((date) => {
          const dateParts = getDateParts(date);
          const isToday = date === todayStr;
          const dayAppts = (apptsByDate[date] || []).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
          return <div key={date} className={`bg-white border border-[#e5e0d6] rounded-xl p-4 ${isToday ? "ring-2 ring-[#1a3325]/20" : ""}`}>
            <p className={`text-sm font-medium mb-2 ${isToday ? "text-[#1a3325] font-bold" : "text-[#3d3830]"}`}>{DAY_NAMES_SHORT[getDateOnlyDayOfWeek(date)]} {dateParts.day} {MONTH_NAMES[dateParts.month - 1]}{isToday && <span className="ml-2 text-xs bg-[#1a3325] text-white px-2 py-0.5 rounded-full">Today</span>}</p>
            {dayAppts.length === 0 ? <p className="text-xs text-[#c4bfb4]">No appointments</p> : <div className="space-y-1.5">
              {dayAppts.map((a: any) => <div key={a.id} className="flex items-center gap-3 text-sm"><span className="font-mono text-xs text-[#8a7e6a] w-28 shrink-0">{fmtTime(a.startTime)}–{fmtTime(a.endTime)}</span><span className="text-[#1a3325] font-medium truncate">{a.clientName}</span><span className="text-[#8a7e6a] text-xs truncate hidden sm:inline">{a.serviceName}</span><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border shrink-0 ml-auto ${STATUS_COLORS[a.status] || ""}`}>{a.status}</span></div>)}
            </div>}
          </div>;
        })}
      </div>}

      {view === "day" && (() => {
        const dayAppts = (apptsByDate[current] || []).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
        return <div>{dayAppts.length === 0 ? <p className="text-sm text-[#5a554d] bg-white border border-[#e5e0d6] rounded-xl p-6 text-center">No appointments on this day.</p> : <div className="space-y-3">
          {dayAppts.map((a: any) => <div key={a.id} className="bg-white border border-[#e5e0d6] rounded-xl p-5"><div className="flex items-start justify-between gap-3 mb-2"><div><p className="font-medium text-[#1a3325]">{a.clientName}</p><p className="text-sm text-[#5a554d]">{a.serviceName || "Session"}</p></div><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border shrink-0 ${STATUS_COLORS[a.status] || ""}`}>{a.status}</span></div><p className="text-sm text-[#8a7e6a] font-mono">{fmtTime(a.startTime)} — {fmtTime(a.endTime)}</p>{a.meetingLink && <a href={a.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a3325] underline mt-2 inline-block">Join Meeting</a>}{a.notes && <p className="text-xs text-[#8a7e6a] mt-2">Notes: {a.notes}</p>}</div>)}
        </div>}</div>;
      })()}
    </div>
  );
}
