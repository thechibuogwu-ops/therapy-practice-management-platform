"use client";
import { usePortal } from "@/lib/usePortal";

export default function AdminDashboard() {
  const { data, loading } = usePortal("admin");
  if (loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  if (!data) return null;
  const s = data.stats;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <h1 className="font-serif text-3xl font-medium text-[#1a3325] mb-8">Practice Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        {[
          { label: "Total Clients", val: s.totalClients },
          { label: "Active Clients", val: s.activeClients },
          { label: "Therapists", val: s.totalTherapists },
          { label: "Upcoming Appts", val: s.upcomingAppointments },
          { label: "Completed", val: s.completedAppointments },
          { label: "Pending Appts", val: s.pendingAppointments },
          { label: "Cancelled", val: s.cancelledAppointments },
          { label: "Successful Payments", val: s.successfulPayments },
          { label: "Revenue (KES)", val: Number(s.revenue).toLocaleString() },
        ].map(i => (
          <div key={i.label} className="bg-white border border-[#e5e0d6] rounded-xl p-5">
            <p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">{i.label}</p>
            <p className="text-2xl font-medium text-[#1a3325]">{i.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
