"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceKES: number };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/services")
      .then(r => r.json())
      .then(d => { if (d.services) setServices(d.services); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">What We Offer</p>
          <h1 className="font-serif text-[2.6rem] md:text-[3.4rem] font-medium text-[#1a3325] mb-4 leading-[1.05]">Our Services</h1>
          <p className="text-[17px] text-[#6b655c] mb-14 max-w-2xl">Services designed for your unique journey — from individual therapy to family support and integrated wellness plans.</p>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 animate-pulse">
                  <div className="h-6 bg-[#eceae6] rounded w-2/3 mb-4" />
                  <div className="h-4 bg-[#eceae6] rounded w-full mb-2" />
                  <div className="h-4 bg-[#eceae6] rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {services.map(s => (
                <article key={s.id} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 shadow-[0_3px_20px_rgba(42,39,36,0.03)] flex flex-col">
                  <h2 className="font-serif text-[1.5rem] md:text-[1.6rem] font-medium text-[#1a3325] mb-3">{s.name}</h2>
                  <p className="text-[15px] text-[#5a554d] leading-relaxed mb-6 flex-1">{s.description}</p>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a7e6a] bg-[#eceae6] px-2.5 py-1 rounded-full">{s.durationMinutes} min</span>
                    <span className="text-[15px] font-bold text-[#1a3325]">KES {s.priceKES.toLocaleString()}</span>
                  </div>
                  <Link href="/book" className="text-center text-[14px] font-bold bg-[#1a3325] text-white rounded-md py-3 hover:bg-[#143025] transition">
                    Book This Service
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
