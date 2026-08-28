"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortal } from "@/lib/usePortal";

export default function AdminClients() {
  const { data, loading: authLoading } = usePortal("admin");
  const [clients, setClients] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", therapistId: "" });
  const [formError, setFormError] = useState("");
  const [invitation, setInvitation] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  function load() {
    if (!data) return;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (active) params.set("active", active);
    if (therapistId) params.set("therapistId", therapistId);
    fetch(`/api/admin/clients?${params}`).then(r => r.json()).then(d => { setClients(d.clients || []); setTotal(d.total || 0); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [data, page, search, active, therapistId]);
  useEffect(() => { if (data) fetch("/api/admin/therapists?limit=50&active=true").then(r => r.json()).then(d => setTherapists(d.therapists || [])); }, [data]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    const res = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(result.error || "Unable to create client."); return; }
    setShowAdd(false); setForm({ fullName: "", email: "", phone: "", therapistId: "" }); setInvitation(result.invitation || null); load();
  }

  if (authLoading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  const pages = Math.max(1, Math.ceil(total / limit));

  return <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><h1 className="font-serif text-2xl font-medium text-[#1a3325]">Client Management</h1><button onClick={() => setShowAdd(!showAdd)} className="text-[14px] font-bold bg-[#1a3325] text-white px-5 py-2.5 rounded-md hover:bg-[#143025] transition">Add Client</button></div>
    {showAdd && <form onSubmit={createClient} className="bg-white border border-[#e5e0d6] rounded-xl p-6 mb-8 grid md:grid-cols-2 gap-4">
      <h2 className="md:col-span-2 font-medium text-[#1a3325]">Create Client Account</h2>
      <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" className="px-4 py-3 rounded-lg border border-[#ddd9cf]" />
      <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="px-4 py-3 rounded-lg border border-[#ddd9cf]" />
       <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="px-4 py-3 rounded-lg border border-[#ddd9cf]" />
       <select required value={form.therapistId} onChange={e => setForm({ ...form, therapistId: e.target.value })} className="px-4 py-3 rounded-lg border border-[#ddd9cf]"><option value="">Assign therapist…</option>{therapists.map(t => <option key={t.id} value={t.id}>{t.fullName} — {t.specialty || "General"}</option>)}</select>
       <p className="md:col-span-2 text-sm text-[#5a554d]">The client will receive an activation invitation to choose their own password.</p>
      {formError && <p className="md:col-span-2 text-sm text-red-600">{formError}</p>}
      <div className="md:col-span-2 flex gap-3"><button disabled={saving} className="bg-[#1a3325] text-white font-bold py-2.5 px-5 rounded-md disabled:opacity-50">{saving ? "Creating…" : "Create Client"}</button><button type="button" onClick={() => setShowAdd(false)} className="text-sm text-[#5a554d]">Cancel</button></div>
     </form>}
     {invitation && <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-sm"><p className="font-medium text-[#1a3325]">Client account created. Activation is required before sign-in.</p><p className="text-[#5a554d] mt-1">Invitation email delivery is not configured.</p>{invitation.activationUrl ? <p className="mt-3 break-all"><a href={invitation.activationUrl} target="_blank" rel="noreferrer" className="font-bold text-[#1a3325] underline">Open development activation link</a></p> : <p className="mt-2 text-[#8a7e6a]">Activation URLs are available only when SHOW_INVITATION_URLS is enabled in explicit development/demo mode.</p>}</div>}
     <div className="grid md:grid-cols-3 gap-3 mb-6">
      <input value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} placeholder="Search name, email, phone…" className="px-4 py-3 rounded-lg bg-white border border-[#ddd9cf]" />
      <select value={therapistId} onChange={e => { setPage(1); setTherapistId(e.target.value); }} className="px-4 py-3 rounded-lg bg-white border border-[#ddd9cf]"><option value="">All therapists</option>{therapists.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select>
      <select value={active} onChange={e => { setPage(1); setActive(e.target.value); }} className="px-4 py-3 rounded-lg bg-white border border-[#ddd9cf]"><option value="">All account statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
    </div>
    {loading ? <p className="text-[#8a7e6a]">Loading…</p> : <div className="bg-white border border-[#e5e0d6] rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#f8f6f2] border-b border-[#e5e0d6] text-left"><tr><th className="px-5 py-3">Client</th><th className="px-5 py-3">Email / Phone</th><th className="px-5 py-3">Assigned Therapist</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-[#eceae6]">{clients.map(c => <tr key={c.id}><td className="px-5 py-3 font-medium text-[#1a3325]">{c.fullName}</td><td className="px-5 py-3 text-[#5a554d]">{c.email}<br />{c.phone || "—"}</td><td className="px-5 py-3 text-[#5a554d]">{c.therapistName}</td><td className="px-5 py-3"><span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${c.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{c.active ? "Active" : "Inactive"}</span></td><td className="px-5 py-3"><Link href={`/admin/clients/${c.id}`} className="text-xs font-bold text-[#1a3325] hover:underline">Manage</Link></td></tr>)}</tbody></table></div></div>}
    <div className="mt-5 flex items-center justify-between text-sm text-[#5a554d]"><span>{total} clients</span><div className="flex gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div></div>
  </div>;
}
