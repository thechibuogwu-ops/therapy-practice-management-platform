"use client";
import { useState, useEffect } from "react";
import { usePortal } from "@/lib/usePortal";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function TherapistAvailability() {
  const { data, loading: authLoading } = usePortal("therapist");
  const [avail, setAvail] = useState<any[]>([]);
  const [toff, setToff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Recurring availability form
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [saving, setSaving] = useState(false);

  // Time-off form
  const [toDate, setToDate] = useState("");
  const [toStart, setToStart] = useState("09:00");
  const [toEnd, setToEnd] = useState("17:00");
  const [toReason, setToReason] = useState("");
  const [toSaving, setToSaving] = useState(false);

  function loadData() {
    Promise.all([
      fetch("/api/portal/availability").then(r => r.json()),
      fetch("/api/portal/timeoff").then(r => r.json()),
    ]).then(([a, t]) => {
      setAvail(a.availability || []);
      setToff(t.timeoff || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { if (data) loadData(); }, [data]);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/portal/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayOfWeek: day, startTime: start, endTime: end }) });
    setSaving(false); loadData();
  }

  async function removeSlot(id: string) {
    await fetch("/api/portal/availability", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  }

  async function addTimeoff(e: React.FormEvent) {
    e.preventDefault(); setToSaving(true);
    await fetch("/api/portal/timeoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: toDate, startTime: toStart, endTime: toEnd, reason: toReason }) });
    setToSaving(false); setToDate(""); setToReason(""); loadData();
  }

  async function removeTimeoff(id: string) {
    await fetch("/api/portal/timeoff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  }

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-3xl">
      <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-8">Availability & Time Off</h1>

      {/* Recurring Availability */}
      <section className="mb-12">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Weekly Availability</h2>
        <div className="space-y-3 mb-6">
          {avail.length === 0 ? <p className="text-sm text-[#5a554d]">No recurring availability configured.</p> : avail.map(a => (
            <div key={a.id} className="bg-white border border-[#e5e0d6] rounded-xl p-4 flex items-center justify-between">
              <div><p className="font-medium text-[#1a3325]">{DAY_NAMES[a.dayOfWeek]}</p><p className="text-sm text-[#5a554d]">{a.startTime} — {a.endTime}</p></div>
              <button onClick={() => removeSlot(a.id)} className="text-xs text-red-600 font-bold hover:underline">Remove</button>
            </div>
          ))}
        </div>
        <form onSubmit={addSlot} className="bg-white border border-[#e5e0d6] rounded-xl p-6 space-y-4">
          <p className="text-sm font-medium text-[#1a3325]">Add Weekly Slot</p>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Day</label><select value={day} onChange={e => setDay(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm">{DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Start</label><input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">End</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
          </div>
          <button type="submit" disabled={saving} className="bg-[#1a3325] text-white font-bold py-2.5 px-5 rounded-md hover:bg-[#143025] transition disabled:opacity-50 text-sm">{saving ? "Adding…" : "Add Slot"}</button>
        </form>
      </section>

      {/* Time Off */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Time Off / Blocked Periods</h2>
        <div className="space-y-3 mb-6">
          {toff.length === 0 ? <p className="text-sm text-[#5a554d]">No upcoming time off.</p> : toff.map(t => (
            <div key={t.id} className="bg-white border border-[#e5e0d6] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1a3325]">{t.date}</p>
                <p className="text-sm text-[#5a554d]">{t.startTime} — {t.endTime}{t.reason ? ` · ${t.reason}` : ""}</p>
              </div>
              <button onClick={() => removeTimeoff(t.id)} className="text-xs text-red-600 font-bold hover:underline">Remove</button>
            </div>
          ))}
        </div>
        <form onSubmit={addTimeoff} className="bg-white border border-[#e5e0d6] rounded-xl p-6 space-y-4">
          <p className="text-sm font-medium text-[#1a3325]">Add Time Off</p>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Start</label><input type="time" value={toStart} onChange={e => setToStart(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">End</label><input type="time" value={toEnd} onChange={e => setToEnd(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
          </div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Reason (optional)</label><input value={toReason} onChange={e => setToReason(e.target.value)} placeholder="e.g. Personal leave" className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
          <button type="submit" disabled={toSaving} className="bg-[#1a3325] text-white font-bold py-2.5 px-5 rounded-md hover:bg-[#143025] transition disabled:opacity-50 text-sm">{toSaving ? "Adding…" : "Add Time Off"}</button>
        </form>
      </section>
    </div>
  );
}
