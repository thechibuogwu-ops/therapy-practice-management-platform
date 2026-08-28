"use client";
import { useState } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

const FAQS = [
  { q: "Is my information confidential?", a: "Yes. All communications and records are protected with strict privacy measures. Only you and your assigned therapist can access your private conversations and documents. Our platform uses role-based server authorization to prevent unauthorized access." },
  { q: "How do I book a session?", a: "Click 'Book Appointment' from any page. You will choose your therapist, select a service, pick a date and time from their real availability, enter your details, and then confirm your booking. Payment is handled securely through our platform." },
  { q: "Can I change therapists?", a: "Yes. You can request a new therapist assignment at any time through your client portal or by contacting the practice administrator." },
  { q: "What payment methods do you accept?", a: "We support M-PESA, debit and credit cards, Apple Pay and PesaLink through our secure payment providers (Paystack and Flutterwave)." },
  { q: "Can I book online sessions?", a: "Yes. We offer both in-person appointments at our Nairobi practice and secure video consultations. Your therapist will share a private meeting link before each online session." },
  { q: "What happens at the first session?", a: "Your first session is typically an Initial Consultation where your therapist will learn about your background, current challenges and goals. Together you will develop a personalised care plan." },
  { q: "How long are sessions?", a: "Session length depends on the service. Individual therapy sessions are typically 50 minutes. Initial consultations and couples sessions are 60 minutes. You can see exact durations on our Services page." },
  { q: "How do I access my client portal?", a: "After booking your first appointment, you will receive login credentials for your secure client portal. From there you can message your therapist, view appointments, manage documents and track payments." },
  { q: "Is the video consultation secure?", a: "Yes. Meeting links are private and shared only with you and your therapist. They are not exposed through any public URL." },
  { q: "What if I need to cancel?", a: "You can cancel or reschedule appointments through your client portal. We ask that you provide at least 24 hours notice where possible." },
];

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">Support</p>
          <h1 className="font-serif text-[2.6rem] md:text-[3.4rem] font-medium text-[#1a3325] mb-4 leading-[1.05]">Frequently Asked Questions</h1>
          <p className="text-[17px] text-[#6b655c] mb-14 max-w-2xl">Clear answers to common questions about our practice, booking process and client portal.</p>

          <div className="space-y-3">
            {FAQS.map((f, idx) => (
              <div key={idx} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-7 py-5 font-medium text-[#1a3325] flex items-center justify-between hover:bg-[#f0ece6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3325]/30 focus-visible:ring-inset"
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  aria-expanded={openIdx === idx}
                >
                  <span className="pr-4">{f.q}</span>
                  <span className="text-[#8a7e6a] text-lg font-light shrink-0 transition-transform duration-200" style={{ transform: openIdx === idx ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openIdx === idx && (
                  <div className="px-7 pb-5 text-[15px] text-[#5a554d] leading-relaxed">{f.a}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 pt-16 border-t border-[#ddd8cf]/60">
            <h2 className="font-serif text-[1.5rem] font-medium text-[#1a3325] mb-3">Still have questions?</h2>
            <p className="text-[15px] text-[#6b655c] mb-6">We are happy to help. Reach out and we will respond within 24 hours.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/contact" className="text-[14px] font-bold bg-[#1a3325] text-white px-6 py-2.5 rounded-md hover:bg-[#143025] transition">Contact Us</Link>
              <Link href="/book" className="text-[14px] font-medium text-[#1a3325] border border-[#ddd8cf] px-6 py-2.5 rounded-md hover:border-[#1a3325] transition">Book an Appointment</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
