"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePortal } from "@/lib/usePortal";
import { formatPracticeDate, getNairobiToday } from "@/lib/practice-time";

function fmtTime(t: string) { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m.toString().padStart(2, "0")} ${ap}`; }

export default function ClientAppointments() {
  const { data, loading: authLoading } = usePortal("client");
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  function loadAppts() {
    fetch("/api/portal/appointments").then(r => r.json()).then(d => { setAppts(d.appointments || []); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { if (data) loadAppts(); }, [data]);

  async function cancelAppt(id: string) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancelling(id);
    const res = await fetch(`/api/portal/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
    if (res.ok) loadAppts();
    setCancelling(null);
  }

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  const today = getNairobiToday();
  const upcoming = appts.filter(a => a.date >= today && !["cancelled", "completed"].includes(a.status));
  const past = appts.filter(a => a.date < today || a.status === "completed");
  const cancelled = appts.filter(a => a.status === "cancelled");

  const ApptCard = ({ a }: { a: any }) => (
    <div className="bg-white border border-[#e5e0d6] rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <p className="font-medium text-[#1a3325]">{formatPracticeDate(a.date, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
          <p className="text-sm text-[#5a554d]">{fmtTime(a.startTime)} — {fmtTime(a.endTime)}</p>
          <p className="text-sm text-[#5a554d]">{a.serviceName || "Session"} · {a.therapistName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${a.status === "confirmed" ? "bg-green-50 text-green-700" : a.status === "cancelled" ? "bg-red-50 text-red-600" : a.status === "completed" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{a.status}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        {a.meetingLink && !["cancelled", "completed"].includes(a.status) && <a href={a.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#1a3325] underline">Join Meeting</a>}
        {!["cancelled", "completed", "no-show"].includes(a.status) && a.date >= today && (
          <button onClick={() => cancelAppt(a.id)} disabled={cancelling === a.id} className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50">{cancelling === a.id ? "Cancelling…" : "Cancel"}</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-medium text-[#1a3325]">Appointments</h1>
        <Link href="/book" className="text-[14px] font-bold bg-[#1a3325] text-white px-5 py-2.5 rounded-md hover:bg-[#143025] transition">Book Session</Link>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Upcoming</h2>
        {upcoming.length === 0 ? <p className="text-sm text-[#5a554d]">No upcoming appointments</p> : <div className="space-y-3">{upcoming.map(a => <ApptCard key={a.id} a={a} />)}</div>}
      </section>
      {past.length > 0 && <section className="mb-10"><h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Past</h2><div className="space-y-3">{past.map(a => <ApptCard key={a.id} a={a} />)}</div></section>}
      {cancelled.length > 0 && <section><h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Cancelled</h2><div className="space-y-3">{cancelled.map(a => <ApptCard key={a.id} a={a} />)}</div></section>}
    </div>
  );
}
