"use client";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

const STEPS = [
  { step: "01", title: "Choose Your Therapist", desc: "Browse our therapist profiles. Each therapist lists their specialties, qualifications and availability so you can find the right fit for your needs." },
  { step: "02", title: "Book a Session", desc: "Select the type of session you need, pick a date and choose from the therapist's real available times. No guessing — you'll only see times that are genuinely open." },
  { step: "03", title: "Complete Payment", desc: "Pay securely through our platform using M-PESA, debit or credit card, Apple Pay or PesaLink. Your booking is confirmed once payment is verified." },
  { step: "04", title: "Attend Your Session", desc: "Meet your therapist in person at our Nairobi practice or via a secure, private video link shared before your appointment. All sessions are confidential." },
  { step: "05", title: "Continue Your Care", desc: "After your session, access your secure client portal to message your therapist, review documents, manage upcoming appointments and track your progress." },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">Your Journey</p>
          <h1 className="font-serif text-[2.6rem] md:text-[3.4rem] font-medium text-[#1a3325] mb-4 leading-[1.05]">How Therapy Works</h1>
          <p className="text-[17px] text-[#6b655c] mb-16 max-w-2xl">A simple, secure process designed around your comfort and privacy.</p>

          <div className="space-y-12 md:space-y-16">
            {STEPS.map(s => (
              <div key={s.step} className="grid md:grid-cols-[80px_1fr] gap-6 items-start">
                <div className="text-[4rem] md:text-[5rem] font-serif font-medium text-[#1a3325]/10 leading-none select-none">{s.step}</div>
                <div>
                  <h2 className="font-serif text-[1.5rem] md:text-[1.7rem] font-medium text-[#1a3325] mb-3">{s.title}</h2>
                  <p className="text-[16px] text-[#5a554d] leading-relaxed max-w-xl">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-16 border-t border-[#ddd8cf]/60 text-center">
            <h2 className="font-serif text-[1.8rem] md:text-[2.2rem] font-medium text-[#1a3325] mb-4">Ready to begin?</h2>
            <p className="text-[16px] text-[#6b655c] mb-8 max-w-md mx-auto">Your first step is the hardest. We will meet you there with compassion and clinical expertise.</p>
            <Link href="/book" className="inline-block text-[15px] font-bold bg-[#1a3325] text-white px-8 py-3.5 rounded-md hover:bg-[#143025] transition shadow-md shadow-[#1a3325]/10">
              Book an Appointment
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
