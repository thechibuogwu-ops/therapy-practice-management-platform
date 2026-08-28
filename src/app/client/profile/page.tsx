"use client";
import { useState } from "react";
import { usePortal } from "@/lib/usePortal";

export default function ClientProfile() {
  const { data, loading } = usePortal("client");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inited, setInited] = useState(false);

  if (loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  if (data && !inited) { setFullName(data.user.fullName); setPhone(data.user.phone || ""); setInited(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false);
    await fetch("/api/portal/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, phone }) });
    setSaving(false); setSaved(true);
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-xl">
      <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-8">Profile</h1>
      <form onSubmit={handleSave} className="space-y-5">
        <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Full Name</label><input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition" /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Email</label><input value={data?.user.email || ""} disabled className="w-full px-4 py-3 rounded-lg bg-[#eceae6] border border-[#ddd9cf] text-[#5a554d]" /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition" placeholder="+254 7XX XXX XXX" /></div>
        <button type="submit" disabled={saving} className="bg-[#1a3325] text-white font-bold py-3 px-6 rounded-md hover:bg-[#143025] transition disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button>
        {saved && <p className="text-sm text-green-700">Profile updated.</p>}
      </form>
    </div>
  );
}
