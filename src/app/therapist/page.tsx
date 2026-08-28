"use client";
import Link from "next/link";
import { usePortal } from "@/lib/usePortal";

export default function TherapistDashboard() {
  const { data, loading } = usePortal("therapist");
  if (loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  if (!data) return null;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <h1 className="font-serif text-3xl font-medium text-[#1a3325] mb-1">Welcome, {data.user.fullName.split(" ").pop()}</h1>
      <p className="text-[15px] text-[#8a7e6a] mb-8">Therapist workspace</p>

      <div className="grid md:grid-cols-4 gap-5 mb-10">
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-5"><p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">Today&apos;s Sessions</p><p className="text-2xl font-medium text-[#1a3325]">{data.todaySessions?.length || 0}</p></div>
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-5"><p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">Clients</p><p className="text-2xl font-medium text-[#1a3325]">{data.clientCount}</p></div>
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-5"><p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">Unread Messages</p><p className="text-2xl font-medium text-[#1a3325]">{data.unreadMessages}</p></div>
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-5"><p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">Upcoming</p><p className="text-2xl font-medium text-[#1a3325]">{data.upcomingAppointments?.length || 0}</p></div>
      </div>

      {data.todaySessions?.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Today&apos;s Sessions</h2>
          <div className="bg-white border border-[#e5e0d6] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8f6f2] border-b border-[#e5e0d6] text-left"><tr><th className="px-5 py-3 font-medium text-[#8a7e6a]">Time</th><th className="px-5 py-3 font-medium text-[#8a7e6a]">Client</th><th className="px-5 py-3 font-medium text-[#8a7e6a]">Status</th></tr></thead>
                <tbody className="divide-y divide-[#eceae6]">
                  {data.todaySessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-[#f8f6f2] transition-colors"><td className="px-5 py-3 text-[#1a3325]">{s.startTime} — {s.endTime}</td><td className="px-5 py-3 text-[#1a3325]">{s.clientName}</td><td className="px-5 py-3 capitalize text-[#5a554d]">{s.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {data.recentClients?.length > 0 && <section className="mb-10"><h2 className="text-sm font-bold uppercase tracking-wider text-[#8a7e6a] mb-4">Recent Clients</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{data.recentClients.map((client: any) => <Link key={client.id} href={`/therapist/clients/${client.id}`} className="bg-white border border-[#e5e0d6] rounded-xl p-4 hover:border-[#1a3325]/30 transition"><p className="font-medium text-[#1a3325]">{client.fullName}</p><p className="text-xs text-[#8a7e6a]">{client.email}</p></Link>)}</div></section>}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/therapist/clients" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">My Clients</h3><p className="text-xs text-[#8a7e6a]">View assigned clients</p></Link>
        <Link href="/therapist/messages" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Messages</h3><p className="text-xs text-[#8a7e6a]">Client conversations</p></Link>
        <Link href="/therapist/availability" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Availability</h3><p className="text-xs text-[#8a7e6a]">Manage schedule</p></Link>
      </div>
    </div>
  );
}
