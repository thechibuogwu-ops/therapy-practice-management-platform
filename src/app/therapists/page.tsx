"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

type Therapist = { id: string; fullName: string; bio: string | null; specialty: string | null };

const PLACEHOLDER_IMGS: Record<string, string> = {
  "Dr. Sarah Wanjiku": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=800&auto=format&fit=crop",
  "Dr. James Mutua": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
  "Dr. Aisha Omar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
  "Dr. Peter Kamau": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop",
};

function therapistImg(name: string) {
  return PLACEHOLDER_IMGS[name] || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop";
}

export default function TherapistsListPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/therapists")
      .then(r => r.json())
      .then(d => { if (d.therapists) setTherapists(d.therapists); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">Our Team</p>
          <h1 className="font-serif text-[2.6rem] md:text-[3.4rem] font-medium text-[#1a3325] mb-4 leading-[1.05]">Meet Our Therapists</h1>
          <p className="text-[17px] text-[#6b655c] mb-14 max-w-2xl">Each therapist brings professional training, clinical experience and a personal commitment to your wellbeing.</p>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[0,1,2,3].map(i => (
                <div key={i} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[4/5] bg-[#ebe7de]" />
                  <div className="p-7"><div className="h-5 bg-[#eceae6] rounded w-2/3 mb-2" /><div className="h-4 bg-[#eceae6] rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {therapists.map(t => (
                <Link href={`/therapists/${t.id}`} key={t.id} className="group block bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="aspect-[4/5] overflow-hidden relative bg-[#ebe7de]">
                    <img src={therapistImg(t.fullName)} alt={t.fullName} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a3325]/50 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5">
                      <span className="text-white/95 text-[13px] font-medium bg-[#1a3325]/55 backdrop-blur-sm px-3 py-1 rounded-full">{t.specialty}</span>
                    </div>
                  </div>
                  <div className="p-7">
                    <h3 className="font-serif text-[1.2rem] font-medium text-[#1a3325] mb-0.5">{t.fullName}</h3>
                    <p className="text-[14px] text-[#8a7e6a] mb-4">{t.specialty}</p>
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#1a3325] bg-[#eceae6] px-3 py-1 rounded-full">View Profile</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
