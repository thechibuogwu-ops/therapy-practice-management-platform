"use client";
import Link from "next/link";
import { usePortal } from "@/lib/usePortal";

export default function ClientTherapistPage() {
  const { data, loading } = usePortal("client");
  if (loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;
  const t = data?.therapist;
  if (!t) return <div className="p-8"><p className="text-[#5a554d]">No therapist assigned. Contact the practice administrator.</p></div>;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-3xl">
      <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-8">My Therapist</h1>
      <div className="bg-white border border-[#e5e0d6] rounded-xl p-6 md:p-8">
        <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-1">{t.fullName}</h2>
        <p className="text-sm text-[#8a7e6a] mb-4">{t.specialty}</p>
        {t.bio && <p className="text-[15px] text-[#3d3830] leading-relaxed mb-6">{t.bio}</p>}
        <div className="flex flex-wrap gap-3">
          <Link href="/client/messages" className="text-[14px] font-bold bg-[#1a3325] text-white px-5 py-2.5 rounded-md hover:bg-[#143025] transition">Message Therapist</Link>
          <Link href="/book" className="text-[14px] font-medium text-[#1a3325] border border-[#ddd8cf] px-5 py-2.5 rounded-md hover:border-[#1a3325] transition">Book Session</Link>
        </div>
      </div>
    </div>
  );
}
