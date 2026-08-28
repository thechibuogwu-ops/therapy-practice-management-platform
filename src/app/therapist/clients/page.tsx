"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortal } from "@/lib/usePortal";

export default function TherapistClients() {
  const { data, loading: authLoading } = usePortal("therapist");
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    fetch(`/api/portal/clients?${params}`).then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => { if (!response.ok) throw new Error(payload.error); setClients(payload.clients || []); setTotal(payload.total || 0); setLoading(false); })
      .catch(() => { setClients([]); setLoading(false); });
  }, [data, search, page]);

  if (authLoading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  const pages = Math.max(1, Math.ceil(total / limit));
  return <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
    <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-2">My Clients</h1>
    <p className="text-sm text-[#5a554d] mb-6">Current clients assigned to your care.</p>
    <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, or phone…" className="w-full max-w-md px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition mb-6" />
    {loading ? <p className="text-[#8a7e6a]">Loading…</p> : clients.length === 0 ? <p className="text-[#5a554d]">No clients found.</p> : <div className="space-y-3">{clients.map((client) => <div key={client.id} className="bg-white border border-[#e5e0d6] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="min-w-0"><p className="font-medium text-[#1a3325]">{client.fullName}</p><p className="text-sm text-[#5a554d]">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p><div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#8a7e6a]"><span>{client.appointmentCount} appointment{Number(client.appointmentCount) === 1 ? "" : "s"}</span><span>Next: {client.nextAppointmentDate ? `${client.nextAppointmentDate} ${client.nextAppointmentTime}` : "None"}</span><span>Last: {client.lastAppointmentDate || "None"}</span>{Number(client.unreadMessages) > 0 && <span className="font-bold text-[#1a3325]">{client.unreadMessages} unread</span>}</div></div><div className="flex items-center gap-3 shrink-0"><span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${client.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{client.active ? "Active" : "Inactive"}</span><Link href={`/therapist/clients/${client.id}`} className="text-[13px] font-bold text-[#1a3325] bg-[#eceae6] px-3 py-1 rounded-full hover:bg-[#ddd8cf] transition">Open Workspace</Link></div></div>)}</div>}
    <div className="mt-6 flex items-center justify-between text-sm text-[#5a554d]"><span>{total} client{total === 1 ? "" : "s"}</span><div className="flex gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div></div>
  </div>;
}
