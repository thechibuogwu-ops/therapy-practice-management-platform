"use client";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2000&auto=format&fit=crop" alt="About practice" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#1a3325]/50 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a3325]/60 via-transparent to-[#1a3325]/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6">
              <h1 className="font-serif text-5xl md:text-7xl font-medium text-white mb-4">About DIBA Wellness</h1>
              <p className="text-[#e8dcc8] text-lg md:text-xl max-w-2xl mx-auto">A private therapy practice rooted in trust, clinical expertise and human care.</p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <p className="text-[#8a7e6a] uppercase tracking-[0.2em] text-xs font-bold mb-6">Our Philosophy</p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#1a3325] mb-8 leading-tight">Therapy that respects the whole person.</h2>
          <div className="space-y-6 text-[17px] text-[#3d3830] leading-[1.75]">
            <p>Light Wellness Care was founded with a clear belief: therapy must be professional, accessible and profoundly respectful of privacy. We serve individuals, couples and families seeking support for anxiety, trauma, depression, relationships and life transitions.</p>
            <p>Our therapists combine clinical training with deep cultural understanding. Whether you prefer in-person sessions in Nairobi or secure video consultations, you receive the same standard of compassionate, evidence-based care.</p>
            <p>We believe healing happens when people feel safe, heard and supported by professionals who understand both clinical science and the realities of everyday life.</p>
          </div>

          <div className="mt-16 pt-16 border-t border-[#ddd8cf]/60">
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#1a3325] mb-8 leading-tight">What clients can expect.</h2>
            <div className="space-y-6 text-[17px] text-[#3d3830] leading-[1.75]">
              <p>From your first session, you will meet a therapist who listens carefully and works with you to understand your unique needs. Together, you will develop a personalised care plan rooted in evidence-based practice.</p>
              <p>Sessions can take place in person at our Nairobi practice or via secure video consultation. Your therapist will share a private meeting link before each online session.</p>
              <p>Between sessions, you can communicate securely with your therapist through your client portal, share documents, and review your appointment history — all in one private, protected space.</p>
            </div>
          </div>

          <div className="mt-16 pt-16 border-t border-[#ddd8cf]/60">
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#1a3325] mb-8 leading-tight">Privacy and confidentiality.</h2>
            <div className="space-y-6 text-[17px] text-[#3d3830] leading-[1.75]">
              <p>We take privacy seriously. Your conversations, documents, appointment records and messages are protected by strict access controls. Only you and your assigned therapist can access your private information.</p>
              <p>Our platform uses role-based authorization so that no user can access another client&apos;s data. We do not expose your records through public URLs.</p>
            </div>
          </div>

          <div className="mt-16">
            <Link href="/book" className="inline-flex items-center gap-2 bg-[#1a3325] text-white px-8 py-3.5 rounded-md font-bold text-[15px] hover:bg-[#143025] transition shadow-md shadow-[#1a3325]/10">Book an Appointment</Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
