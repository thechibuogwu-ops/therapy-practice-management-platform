"use client";
import { useState } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">Get in Touch</p>
          <h1 className="font-serif text-[2.6rem] md:text-[3.4rem] font-medium text-[#1a3325] mb-4 leading-[1.05]">Contact Us</h1>
          <p className="text-[17px] text-[#6b655c] mb-14 max-w-2xl">Whether you are ready to begin therapy or simply have questions, we respond within 24 hours. Your first step is the hardest — we will meet you there.</p>

          <div className="grid md:grid-cols-2 gap-14 lg:gap-24">
            {/* Details */}
            <div>
              <div className="space-y-6 mb-12">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-1">Email</h3>
                  <a href="mailto:hello@diba.co.ke" className="text-[16px] text-[#1a3325] font-medium hover:underline">hello@diba.co.ke</a>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-1">Phone</h3>
                  <a href="tel:+254712345678" className="text-[16px] text-[#1a3325] font-medium hover:underline">+254 712 345 678</a>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-1">Location</h3>
                  <p className="text-[16px] text-[#3d3830]">Nairobi, Kenya</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-1">Opening Hours</h3>
                  <p className="text-[16px] text-[#3d3830]">Monday – Friday: 9:00 AM – 5:00 PM</p>
                  <p className="text-[14px] text-[#6b655c]">Weekends and holidays by appointment only.</p>
                </div>
              </div>

              <div className="pt-8 border-t border-[#ddd8cf]/60">
                <h3 className="font-serif text-xl font-medium text-[#1a3325] mb-3">Ready to book?</h3>
                <p className="text-[15px] text-[#6b655c] mb-5">Skip the form and schedule your appointment directly.</p>
                <Link href="/book" className="inline-block text-[14px] font-bold bg-[#1a3325] text-white px-6 py-2.5 rounded-md hover:bg-[#143025] transition">
                  Book an Appointment
                </Link>
              </div>
            </div>

            {/* Form */}
            <div>
              {submitted ? (
                <div className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 text-center">
                  <h3 className="font-serif text-xl font-medium text-[#1a3325] mb-3">Thank you</h3>
                  <p className="text-[15px] text-[#6b655c]">We have received your message and will respond within 24 hours.</p>
                </div>
              ) : (
                <form
                  className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 shadow-[0_3px_20px_rgba(42,39,36,0.03)] space-y-5"
                  onSubmit={e => { e.preventDefault(); setSubmitted(true); }}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">First Name</label>
                      <input id="first" className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="First Name" required />
                    </div>
                    <div>
                      <label htmlFor="last" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Last Name</label>
                      <input id="last" className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="Last Name" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Email Address</label>
                    <input id="email" type="email" className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="you@example.com" required />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Message</label>
                    <textarea id="message" className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] h-32 focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="How can we help you?" />
                  </div>
                  <button type="submit" className="w-full bg-[#1a3325] text-white font-bold py-3.5 rounded-md hover:bg-[#143025] transition shadow-md shadow-[#1a3325]/8">
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
