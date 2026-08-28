"use client";
import { useState, useEffect } from "react";
import { usePortal } from "@/lib/usePortal";
import { getNairobiToday } from "@/lib/practice-time";

function fmtTime(t: string) { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m.toString().padStart(2, "0")} ${ap}`; }

export default function TherapistAppointments() {
  const { data, loading: authLoading } = usePortal("therapist");
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  function loadAppts() {
    fetch("/api/portal/appointments?limit=200").then(r => r.json()).then(d => { setAppts(d.appointments || []); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { if (data) loadAppts(); }, [data]);

  async function doAction(id: string, action: string) {
    if (action === "cancel" && !confirm("Cancel this appointment?")) return;
    setActing(id);
    await fetch(`/api/portal/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    loadAppts();
    setActing(null);
  }

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  const today = getNairobiToday();
  const upcoming = appts.filter(a => a.date >= today && !["cancelled", "completed"].includes(a.status));
  const past = appts.filter(a => a.date < today || a.status === "completed");

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-8">Appointments</h1>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? <p className="text-sm text-[#5a554d]">No upcoming appointments</p> : (
          <div className="space-y-3">
            {upcoming.map(a => (
              <div key={a.id} className="bg-white border border-[#e5e0d6] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-[#1a3325]">{a.clientName} · {a.date}</p>
                    <p className="text-sm text-[#5a554d]">{fmtTime(a.startTime)}–{fmtTime(a.endTime)} · {a.serviceName || "Session"}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${a.status === "confirmed" ? "bg-green-50 text-green-700" : a.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>{a.status}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs font-bold">
                  {a.status === "pending" && <button onClick={() => doAction(a.id, "confirm")} disabled={acting === a.id} className="text-green-700 hover:underline">Confirm</button>}
                  {["pending", "confirmed"].includes(a.status) && <button onClick={() => doAction(a.id, "complete")} disabled={acting === a.id} className="text-blue-700 hover:underline">Complete</button>}
                  {["pending", "confirmed"].includes(a.status) && <button onClick={() => doAction(a.id, "no-show")} disabled={acting === a.id} className="text-gray-600 hover:underline">No-Show</button>}
                  {!["cancelled", "completed"].includes(a.status) && <button onClick={() => doAction(a.id, "cancel")} disabled={acting === a.id} className="text-red-600 hover:underline">Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Past ({past.length})</h2>
          <div className="space-y-2">
            {past.map(a => (
              <div key={a.id} className="bg-white border border-[#e5e0d6] rounded-xl p-4 flex items-center justify-between text-sm">
                <span className="text-[#1a3325]">{a.clientName} · {a.date} · {fmtTime(a.startTime)}</span>
                <span className="capitalize text-[#8a7e6a]">{a.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
