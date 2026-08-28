"use client";
import Link from "next/link";
import { usePortal } from "@/lib/usePortal";

export default function ClientDashboard() {
  const { data, loading } = usePortal("client");
  if (loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  if (!data) return null;

  const appt = data.upcomingAppointments?.[0];
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <h1 className="font-serif text-3xl font-medium text-[#1a3325] mb-1">Welcome back, {data.user.fullName.split(" ")[0]}</h1>
      <p className="text-[15px] text-[#8a7e6a] mb-8">Your secure client portal</p>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">Next Appointment</p>
          {appt ? (
            <>
              <p className="text-lg font-medium text-[#1a3325]">{appt.date}</p>
              <p className="text-sm text-[#5a554d]">{appt.startTime} — {appt.endTime}</p>
              <p className="text-xs text-[#8a7e6a] mt-1 capitalize">{appt.status}</p>
            </>
          ) : <p className="text-sm text-[#5a554d]">No upcoming appointments</p>}
        </div>
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">My Therapist</p>
          {data.therapist ? <p className="text-lg font-medium text-[#1a3325]">{data.therapist.fullName}</p> : <p className="text-sm text-[#5a554d]">Not assigned</p>}
          {data.therapist && <p className="text-xs text-[#8a7e6a]">{data.therapist.specialty}</p>}
        </div>
        <div className="bg-white border border-[#e5e0d6] rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-[#8a7e6a] font-bold mb-1">Unread Messages</p>
          <p className="text-lg font-medium text-[#1a3325]">{data.unreadMessages}</p>
        </div>
      </div>

      <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-4">Quick Actions</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/client/messages" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Message Therapist</h3><p className="text-xs text-[#8a7e6a]">Private conversation</p></Link>
        <Link href="/book" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Book a Session</h3><p className="text-xs text-[#8a7e6a]">Schedule appointment</p></Link>
        <Link href="/client/appointments" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">View Appointments</h3><p className="text-xs text-[#8a7e6a]">Upcoming & past sessions</p></Link>
        <Link href="/client/documents" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Documents</h3><p className="text-xs text-[#8a7e6a]">{data.recentDocuments?.length || 0} files</p></Link>
        <Link href="/client/payments" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Payments</h3><p className="text-xs text-[#8a7e6a]">{data.payments.pending} pending</p></Link>
        <Link href="/client/profile" className="bg-white border border-[#e5e0d6] rounded-xl p-5 hover:border-[#1a3325]/30 transition"><h3 className="font-medium text-[#1a3325] mb-1">Profile</h3><p className="text-xs text-[#8a7e6a]">Manage your info</p></Link>
      </div>
    </div>
  );
}
