"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { usePortal } from "@/lib/usePortal";

export default function AdminClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading: authLoading } = usePortal("admin");
  const [record, setRecord] = useState<any>(null); const [therapists, setTherapists] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [invitation, setInvitation] = useState<any>(null); const [resending, setResending] = useState(false);
  function load() { if (!data) return; fetch(`/api/admin/clients/${id}`).then(r => r.json()).then(d => { setRecord(d); if (d.client) setForm({ fullName: d.client.fullName, email: d.client.email, phone: d.client.phone || "", active: d.client.active, therapistId: d.client.therapistId }); setLoading(false); }).catch(() => setLoading(false)); }
  useEffect(() => { load(); }, [data, id]);
  useEffect(() => { if (data) fetch("/api/admin/therapists?limit=50&active=true").then(r => r.json()).then(d => setTherapists(d.therapists || [])); }, [data]);
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(""); const r = await fetch(`/api/admin/clients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const d = await r.json(); setSaving(false); if (!r.ok) setError(d.error || "Unable to save."); else load(); }
  async function resendInvitation() { setResending(true); setError(""); const r = await fetch(`/api/admin/users/${record.client.userId}/invitation`, { method: "POST" }); const d = await r.json(); setResending(false); if (!r.ok) { setError(d.error || "Unable to resend invitation."); return; } setInvitation(d.invitation); }
  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  if (!record?.client || !form) return <div className="p-8 text-red-600">Client not found.</div>;
  return <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
    <Link href="/admin/clients" className="text-sm text-[#1a3325] hover:underline">← Back to Clients</Link>
    <h1 className="font-serif text-2xl font-medium text-[#1a3325] mt-5 mb-8">Manage {record.client.fullName}</h1>
    <form onSubmit={save} className="bg-white border border-[#e5e0d6] rounded-xl p-6 grid md:grid-cols-2 gap-4 mb-10">
      <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Name</label><input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-3 border rounded-lg border-[#ddd9cf]" /></div>
      <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border rounded-lg border-[#ddd9cf]" /></div>
      <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border rounded-lg border-[#ddd9cf]" /></div>
      <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Assigned Therapist</label><select value={form.therapistId} onChange={e => setForm({ ...form, therapistId: e.target.value })} className="w-full px-4 py-3 border rounded-lg border-[#ddd9cf]">{therapists.map(t => <option key={t.id} value={t.id}>{t.fullName} — {t.specialty || "General"}</option>)}</select></div>
       <label className="flex items-center gap-2 text-sm text-[#5a554d]"><input type="checkbox" disabled={!record.client.verified} checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active account {!record.client.verified && <span className="text-xs text-[#8a7e6a]">(activation required)</span>}</label>
       {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}<div className="md:col-span-2 flex flex-wrap gap-3"><button disabled={saving} className="bg-[#1a3325] text-white font-bold py-2.5 px-5 rounded-md disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button>{!record.client.active && !record.client.verified && <button type="button" onClick={resendInvitation} disabled={resending} className="border border-[#1a3325] text-[#1a3325] font-bold py-2.5 px-5 rounded-md disabled:opacity-50">{resending ? "Creating…" : "Resend Invitation"}</button>}</div>
    </form>
    {invitation && <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 text-sm"><p className="font-medium text-[#1a3325]">A fresh activation invitation was created. Email delivery is not configured.</p>{invitation.activationUrl ? <a href={invitation.activationUrl} target="_blank" rel="noreferrer" className="block mt-2 break-all font-bold text-[#1a3325] underline">Open development activation link</a> : <p className="mt-2 text-[#8a7e6a]">Activation URLs are available only in explicit development/demo mode.</p>}</div>}
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="bg-white border border-[#e5e0d6] rounded-xl p-5"><h2 className="font-medium text-[#1a3325] mb-3">Appointments</h2>{record.appointments.length ? <div className="space-y-2 text-sm">{record.appointments.map((a: any) => <div key={a.id} className="border-b border-[#eceae6] pb-2"><p>{a.date} · {a.startTime}–{a.endTime}</p><p className="text-[#8a7e6a]">{a.serviceName || "Session"} · {a.status}</p></div>)}</div> : <p className="text-sm text-[#5a554d]">No appointments.</p>}</section>
      <section className="bg-white border border-[#e5e0d6] rounded-xl p-5"><h2 className="font-medium text-[#1a3325] mb-3">Payments</h2>{record.payments.length ? <div className="space-y-2 text-sm">{record.payments.map((p: any) => <div key={p.id} className="border-b border-[#eceae6] pb-2"><p>KES {Number(p.amountKES).toLocaleString()} · {p.status}</p><p className="text-[#8a7e6a]">{p.provider} · {p.transactionRef}</p></div>)}</div> : <p className="text-sm text-[#5a554d]">No payments.</p>}</section>
      <section className="bg-white border border-[#e5e0d6] rounded-xl p-5"><h2 className="font-medium text-[#1a3325] mb-3">Document Metadata</h2>{record.documents.length ? <div className="space-y-2 text-sm">{record.documents.map((d: any) => <div key={d.id} className="border-b border-[#eceae6] pb-2"><p>{d.fileName}</p><p className="text-[#8a7e6a]">{d.category} · {d.uploadedByName || "Unknown"}</p></div>)}</div> : <p className="text-sm text-[#5a554d]">No documents.</p>}<p className="text-xs text-[#8a7e6a] mt-3">Document contents remain restricted to the care team.</p></section>
    </div>
  </div>;
}
