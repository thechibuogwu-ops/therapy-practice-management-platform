"use client";
import { useState, useEffect } from "react";
import { usePortal } from "@/lib/usePortal";

export default function AdminServices() {
  const { data, loading: authLoading } = usePortal("admin");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [dur, setDur] = useState(60); const [price, setPrice] = useState(0); const [active, setActive] = useState(true); const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function loadServices() { fetch("/api/portal/services").then(r => r.json()).then(d => { setServices(d.services || []); setLoading(false); }).catch(() => setLoading(false)); }
  useEffect(() => { if (data) loadServices(); }, [data]);

  function startEdit(s: any) { setEditing(s); setName(s.name); setDesc(s.description || ""); setDur(s.durationMinutes); setPrice(s.priceKES); setActive(s.active); setFormError(""); }
  function startNew() { setEditing("new"); setName(""); setDesc(""); setDur(60); setPrice(0); setActive(true); setFormError(""); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    const payload = { name, description: desc, durationMinutes: dur, priceKES: price, active };
    const res = editing === "new"
      ? await fetch("/api/portal/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/portal/services", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...payload }) });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(result.error || "Unable to save service."); return; }
    setEditing(null); loadServices();
  }

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-4xl">
      <div className="flex items-center justify-between mb-8"><h1 className="font-serif text-2xl font-medium text-[#1a3325]">Services</h1><button onClick={startNew} className="text-[14px] font-bold bg-[#1a3325] text-white px-5 py-2.5 rounded-md hover:bg-[#143025] transition">Add Service</button></div>

      {editing && (
        <form onSubmit={handleSave} className="bg-white border border-[#e5e0d6] rounded-xl p-6 mb-8 space-y-4">
          <h2 className="font-medium text-[#1a3325]">{editing === "new" ? "New Service" : "Edit Service"}</h2>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Service Name" required className="w-full px-4 py-3 rounded-lg bg-[#f8f6f2] border border-[#ddd9cf] text-[#2a2724] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="w-full px-4 py-3 rounded-lg bg-[#f8f6f2] border border-[#ddd9cf] text-[#2a2724] h-20 focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition" />
           <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-1">Duration (min)</label><input required min="1" type="number" value={dur} onChange={e => setDur(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
             <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-1">Price (KES)</label><input required min="0" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd9cf] text-sm" /></div>
           </div>
           <label className="flex items-center gap-2 text-sm text-[#5a554d]"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active for new bookings</label>
           {formError && <p className="text-sm text-red-600">{formError}</p>}
           <div className="flex gap-3"><button type="submit" disabled={saving} className="bg-[#1a3325] text-white font-bold py-2.5 px-5 rounded-md hover:bg-[#143025] transition text-sm disabled:opacity-50">{saving ? "Saving…" : "Save"}</button><button type="button" onClick={() => setEditing(null)} className="text-[#5a554d] text-sm">Cancel</button></div>
        </form>
      )}

      <div className="space-y-3">
        {services.map((s: any) => (
          <div key={s.id} className="bg-white border border-[#e5e0d6] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><p className="font-medium text-[#1a3325]">{s.name}</p><p className="text-sm text-[#5a554d]">{s.durationMinutes} min · KES {s.priceKES.toLocaleString()}</p></div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${s.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{s.active ? "Active" : "Inactive"}</span>
              <button onClick={() => startEdit(s)} className="text-xs text-[#1a3325] font-bold hover:underline">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
