"use client";
import Link from "next/link";
import { useState, useEffect, use } from "react";
import { ArrowLeft } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

type Therapist = { id: string; fullName: string; bio: string | null; specialty: string | null };
type Avail = { id: string; dayOfWeek: number; startTime: string; endTime: string };

const PLACEHOLDER_IMGS: Record<string, string> = {
  "Dr. Sarah Wanjiku": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=1000&auto=format&fit=crop",
  "Dr. James Mutua": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
  "Dr. Aisha Omar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop",
  "Dr. Peter Kamau": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1000&auto=format&fit=crop",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function therapistImg(name: string) {
  return PLACEHOLDER_IMGS[name] || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1000&auto=format&fit=crop";
}

export default function TherapistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [avail, setAvail] = useState<Avail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/therapists/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setTherapist(d.therapist); setAvail(d.availability || []); }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load therapist profile"); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#f4f2ee] flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center"><p className="text-[#8a7e6a] text-lg">Loading profile…</p></main>
      <PublicFooter />
    </div>
  );

  if (error || !therapist) return (
    <div className="min-h-screen bg-[#f4f2ee] flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-medium text-[#1a3325] mb-4">Therapist Not Found</h1>
          <p className="text-[#6b655c] mb-6">{error || "This profile could not be loaded."}</p>
          <Link href="/therapists" className="text-[#1a3325] font-bold underline underline-offset-4">Back to Therapists</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );

  const sortedAvail = [...avail].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-20">
          <Link href="/therapists" className="inline-flex items-center gap-2 text-[14px] text-[#8a7e6a] hover:text-[#1a3325] transition mb-10"><ArrowLeft size={16} /> Back to Therapists</Link>

          <div className="grid md:grid-cols-2 gap-14 lg:gap-20 items-start">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-xl shadow-2xl shadow-[#2a2724]/10">
                <img src={therapistImg(therapist.fullName)} alt={therapist.fullName} className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">Therapist Profile</p>
              <h1 className="font-serif text-[2.4rem] md:text-[3rem] font-medium text-[#1a3325] leading-[1.05] mb-2 tracking-tight">{therapist.fullName}</h1>
              <p className="text-[16px] text-[#8a7e6a] mb-8">{therapist.specialty}</p>

              <div className="space-y-5 text-[16px] text-[#3d3830] leading-[1.8] mb-10">
                {therapist.bio?.split(". ").reduce((acc: string[], sentence, i, arr) => {
                  const idx = Math.floor(i / 2);
                  if (!acc[idx]) acc[idx] = "";
                  acc[idx] += sentence + (i < arr.length - 1 ? ". " : "");
                  return acc;
                }, []).map((para, i) => <p key={i}>{para}</p>)}
              </div>

              {sortedAvail.length > 0 && (
                <div className="mb-10">
                  <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-4">Availability</h2>
                  <div className="space-y-2">
                    {sortedAvail.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-[15px] py-2 border-b border-[#eceae6]">
                        <span className="text-[#3d3830] font-medium">{DAY_NAMES[a.dayOfWeek]}</span>
                        <span className="text-[#8a7e6a]">{a.startTime} — {a.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link href={`/book?therapist=${therapist.id}`} className="inline-flex items-center gap-2 bg-[#1a3325] text-white px-8 py-3.5 rounded-md font-bold text-[15px] hover:bg-[#143025] transition shadow-md shadow-[#1a3325]/10">Book a Session with {therapist.fullName.split(" ").pop()}</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
