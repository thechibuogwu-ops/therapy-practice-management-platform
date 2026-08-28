"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

type Therapist = { id: string; fullName: string; bio: string | null; specialty: string | null };
type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceKES: number };

const PLACEHOLDER_IMGS: Record<string, string> = {
  "Dr. Sarah Wanjiku": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=800&auto=format&fit=crop",
  "Dr. James Mutua": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
  "Dr. Aisha Omar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
  "Dr. Peter Kamau": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop",
};

function therapistImg(name: string) {
  return PLACEHOLDER_IMGS[name] || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop";
}

export default function Home() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/public/therapists").then(r => r.json()).then(d => { if (d.therapists) setTherapists(d.therapists); });
    fetch("/api/public/services").then(r => r.json()).then(d => { if (d.services) setServices(d.services); });
  }, []);

  const faqs = [
    { q: "Is my information confidential?", a: "Yes. All communications and records are protected with strict privacy measures. Only you and your assigned therapist can access your private conversations and documents." },
    { q: "Can I change therapists?", a: "Yes. You can request a new assignment at any time through your portal or by contacting the practice administrator." },
    { q: "What payment methods do you accept?", a: "We support M-PESA, debit and credit cards, Apple Pay and PesaLink through our secure payment providers." },
  ];

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] selection:bg-[#c4b89a] selection:text-[#1a3325]">
      <PublicHeader />

      {/* Hero */}
      <section className="relative w-full min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2400&auto=format&fit=crop" alt="Calm sunrise meadow" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#1a3325]/55 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a3325]/70 via-[#1a3325]/15 to-[#1a3325]/35" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 h-full flex flex-col justify-end pb-28 md:pb-36 pt-48 md:pt-72">
          <p className="text-[#c4b89a] uppercase tracking-[0.25em] text-[11px] font-bold mb-6">Private Therapy Practice — Nairobi</p>
          <h1 className="font-serif text-[3.2rem] md:text-[5.2rem] lg:text-[6.5rem] font-medium text-white leading-[0.95] mb-8 max-w-4xl tracking-tight">
            Support for where you are. Space for where you&apos;re going.
          </h1>
          <p className="text-[#e8dcc8]/85 text-lg md:text-xl max-w-lg leading-relaxed mb-10">DIBA Wellness provides confidential, evidence-based therapy and mental health support for individuals, families and communities across Kenya.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/book" className="inline-flex items-center gap-2 bg-[#bfa070] text-[#1a3325] px-7 py-3 rounded-md font-bold text-[15px] hover:bg-[#c9b489] transition shadow-lg shadow-[#bfa070]/15">Book an Appointment <ArrowRight size={16} /></Link>
            <Link href="/therapists" className="inline-flex items-center gap-2 border border-white/20 text-white px-7 py-3 rounded-md font-semibold text-[15px] hover:bg-white/10 transition">Meet Our Therapists</Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 -mt-16 md:-mt-24 relative z-20">
        <div className="grid md:grid-cols-4 gap-6 md:gap-8">
          {[
            { title: "Confidential Care", desc: "Every conversation protected by strict privacy controls and role-based authorization." },
            { title: "Flexible Sessions", desc: "In-person appointments in Nairobi and secure, private video consultations." },
            { title: "Qualified Professionals", desc: "Registered therapists with clinical training and years of practice experience." },
            { title: "Secure Messaging", desc: "Private communication within your secure client portal, accessible only to you." },
          ].map(i => (
            <div key={i.title} className="bg-[#f8f6f2] border border-[#e8e3d8] rounded-xl p-6 md:p-7 shadow-[0_2px_20px_rgba(42,39,36,0.04)]">
              <h3 className="font-serif text-lg font-medium text-[#1a3325] mb-2">{i.title}</h3>
              <p className="text-[14px] text-[#6b655c] leading-relaxed">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-28 md:pt-40 pb-20 md:pb-28">
        <div className="grid md:grid-cols-2 gap-14 lg:gap-24 items-start">
          <div className="order-2 md:order-1">
            <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-5">About the Practice</p>
            <h2 className="font-serif text-[2.6rem] md:text-[3.4rem] font-medium text-[#1a3325] leading-[1.05] mb-8 tracking-tight">A practice rooted in trust, expertise and humanity.</h2>
            <div className="space-y-5 text-[16.5px] text-[#3d3830] leading-[1.8]">
              <p>DIBA Wellness Care was founded with a clear belief: therapy must be professional, accessible and profoundly respectful of privacy. We serve individuals, couples and families seeking support for anxiety, trauma, depression, relationships and life transitions.</p>
              <p>Our therapists combine clinical training with deep cultural understanding. Whether you prefer in-person sessions in Nairobi or secure video consultations, you receive the same standard of compassionate, evidence-based care.</p>
              <p>We believe healing happens when people feel safe, heard and supported by professionals who understand both clinical science and the realities of everyday life.</p>
            </div>
            <Link href="/about" className="inline-block mt-9 text-[#1a3325] font-bold text-[15px] hover:text-[#143025] transition underline underline-offset-[5px] decoration-1">Learn More About Us</Link>
          </div>
          <div className="order-1 md:order-2 relative">
            <div className="aspect-[4/5] overflow-hidden rounded-xl shadow-2xl shadow-[#2a2724]/10">
              <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1400&auto=format&fit=crop" alt="Therapist and client conversation" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700 ease-out" />
            </div>
            <div className="absolute -bottom-6 -left-4 md:-left-8 bg-[#f8f6f0] border border-[#e5e0d6] rounded-xl p-6 shadow-xl shadow-[#2a2724]/8 max-w-[260px]">
              <p className="font-serif text-3xl md:text-[2.2rem] font-medium text-[#1a3325] leading-none">10+</p>
              <p className="text-[14px] text-[#6b655c] mt-3 leading-snug">Years of combined clinical experience across our team of registered therapists.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-[#eceae6]/50 border-y border-[#ddd8cf]/70">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-28 md:py-36">
          <div className="flex items-end justify-between mb-16 md:mb-20 gap-6 flex-wrap">
            <div className="max-w-2xl">
              <h2 className="font-serif text-[2.4rem] md:text-[3.2rem] font-medium text-[#1a3325] mb-5 leading-[1.08]">How We Can Help</h2>
              <p className="text-[16px] text-[#6b655c] leading-relaxed">Services designed for your unique journey — from individual therapy to family support and integrated wellness plans.</p>
            </div>
            <Link href="/services" className="text-[14px] font-bold text-[#1a3325] underline underline-offset-4 decoration-1 hover:text-[#143025] transition shrink-0">View All Services</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {services.length > 0 ? services.map(s => (
              <article key={s.id} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 shadow-[0_3px_20px_rgba(42,39,36,0.03)]">
                <h3 className="font-serif text-[1.5rem] md:text-[1.6rem] font-medium text-[#1a3325] mb-4">{s.name}</h3>
                <p className="text-[15px] text-[#5a554d] leading-relaxed mb-5">{s.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a7e6a] bg-[#eceae6] px-2.5 py-1 rounded-full">{s.durationMinutes} min</span>
                  <span className="text-[15px] font-bold text-[#1a3325]">KES {s.priceKES.toLocaleString()}</span>
                </div>
              </article>
            )) : (
              <>{[0,1,2].map(i => (
                <div key={i} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 animate-pulse">
                  <div className="h-6 bg-[#eceae6] rounded w-2/3 mb-4" /><div className="h-4 bg-[#eceae6] rounded w-full mb-2" /><div className="h-4 bg-[#eceae6] rounded w-4/5" />
                </div>
              ))}</>
            )}
          </div>
        </div>
      </section>

      {/* Therapists */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-28 md:pt-36 pb-28 md:pb-36">
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
          <h2 className="font-serif text-[2.4rem] md:text-[3rem] font-medium text-[#1a3325] mb-5 leading-[1.08]">Meet Our Therapists</h2>
          <p className="text-[16px] text-[#6b655c] leading-relaxed">Each therapist brings professional training, clinical experience and a personal commitment to your wellbeing.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {therapists.length > 0 ? therapists.map(t => (
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
          )) : (
            <>{[0,1,2,3].map(i => (
              <div key={i} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/5] bg-[#ebe7de]" />
                <div className="p-7"><div className="h-5 bg-[#eceae6] rounded w-2/3 mb-2" /><div className="h-4 bg-[#eceae6] rounded w-1/2" /></div>
              </div>
            ))}</>
          )}
        </div>
        <div className="text-center mt-12">
          <Link href="/therapists" className="text-[14px] font-bold text-[#1a3325] underline underline-offset-4 decoration-1 hover:text-[#143025] transition">View All Therapists</Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#1a3325] text-[#f4f2ee]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-28 md:py-36">
          <h2 className="font-serif text-[2.4rem] md:text-[3rem] font-medium text-center mb-5 leading-[1.08]">How Therapy Works</h2>
          <p className="text-[#c4b89a] text-center text-[16px] max-w-lg mx-auto mb-16 md:mb-20">A simple, secure process designed around your comfort and privacy.</p>
          <div className="grid md:grid-cols-4 gap-10 md:gap-14">
            {[
              { step: "01", title: "Choose Your Therapist", desc: "Browse professional profiles and select a therapist that fits your needs and schedule." },
              { step: "02", title: "Book Securely", desc: "Select a session time and complete secure payment through our platform." },
              { step: "03", title: "Meet Privately", desc: "Attend your session in person or via secure, private video consultation." },
              { step: "04", title: "Continue Your Care", desc: "Access messages, documents and future appointments through your portal." },
            ].map(i => (
              <div key={i.step} className="relative pl-6 md:pl-0">
                <div className="text-[4.5rem] md:text-[6rem] font-serif font-medium text-white/[0.06] leading-none mb-3 select-none">{i.step}</div>
                <h3 className="font-serif text-[1.3rem] font-medium text-white mb-3">{i.title}</h3>
                <p className="text-[#b0a99a] text-[15px] leading-relaxed">{i.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-16">
            <Link href="/how-it-works" className="text-[14px] font-bold text-[#c4b89a] underline underline-offset-4 decoration-1 hover:text-white transition">Learn More About the Process</Link>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-28 md:pt-36 pb-28 md:pb-36">
        <div className="grid md:grid-cols-2 gap-14 lg:gap-24 items-start">
          <div>
            <h2 className="font-serif text-[2.4rem] md:text-[2.8rem] font-medium text-[#1a3325] mb-7 leading-[1.05]">Privacy is not optional.</h2>
            <div className="space-y-5 text-[16px] text-[#3d3830] leading-[1.75]">
              <p>Every conversation, document, appointment and message is handled with strict care. Only you and the members of your assigned care team can access your private information.</p>
              <p>We do not expose your records through public URLs. Our platform uses role-based authorization to ensure that no user can access another client&apos;s data.</p>
            </div>
            <ul className="mt-8 space-y-3 text-[15px] text-[#5a554d]">
              {["Encrypted data transmission","Role-based server authorization","Private messaging scoped to your therapist","No public URLs for documents or records"].map(i=>(
                <li key={i} className="flex items-start gap-3"><span className="w-5 h-5 rounded-full bg-[#eceae6] text-[#1a3325] flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-extrabold">✓</span><span>{i}</span></li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl shadow-[#2a2724]/8">
              <img src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1400&auto=format&fit=crop" alt="Calm mountain landscape" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="bg-[#eceae6]/50 border-y border-[#ddd8cf]/60">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-28 md:py-36">
          <h2 className="font-serif text-[2.4rem] md:text-[2.8rem] font-medium text-[#1a3325] text-center mb-3 leading-[1.05]">Frequently Asked Questions</h2>
          <p className="text-[#6b655c] text-center mb-14 md:mb-16">Clear answers to common questions.</p>
          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div key={f.q} className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-xl overflow-hidden">
                <button className="w-full text-left px-7 py-5 font-medium text-[#1a3325] flex items-center justify-between hover:bg-[#f0ece6] transition" onClick={() => setFaqOpen(faqOpen === idx ? null : idx)} aria-expanded={faqOpen === idx}>
                  <span>{f.q}</span>
                  <span className="text-[#8a7e6a] ml-4 text-lg font-light transition-transform duration-200" style={{ transform: faqOpen === idx ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {faqOpen === idx && <div className="px-7 pb-5 text-[15px] text-[#5a554d] leading-relaxed">{f.a}</div>}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/faq" className="text-[14px] font-bold text-[#1a3325] underline underline-offset-4 decoration-1 hover:text-[#143025] transition">View All FAQs</Link>
          </div>
        </div>
      </section>

      {/* Contact preview */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-28 md:pt-36 pb-28 md:pb-36">
        <div className="grid md:grid-cols-2 gap-14 lg:gap-24">
          <div>
            <h2 className="font-serif text-[2.4rem] md:text-[2.8rem] font-medium text-[#1a3325] mb-6 leading-[1.05]">Reach Out</h2>
            <p className="text-[17px] text-[#3d3830] leading-relaxed mb-10">Whether you are ready to begin therapy or simply have questions, we respond within 24 hours. Your first step is the hardest — we will meet you there.</p>
            <div className="space-y-4 text-[15px] font-medium text-[#5a554d]">
              <div className="flex items-center gap-3"><span className="w-20 text-[#8a7e6a] text-sm">Email</span> <a href="mailto:hello@diba.co.ke" className="text-[#1a3325] hover:underline">hello@diba.co.ke</a></div>
              <div className="flex items-center gap-3"><span className="w-20 text-[#8a7e6a] text-sm">Phone</span> <a href="tel:+254712345678" className="text-[#1a3325] hover:underline">+254 712 345 678</a></div>
              <div className="flex items-center gap-3"><span className="w-20 text-[#8a7e6a] text-sm">Location</span> <span>Nairobi, Kenya</span></div>
            </div>
            <div className="mt-8">
              <Link href="/contact" className="text-[14px] font-bold text-[#1a3325] underline underline-offset-4 decoration-1 hover:text-[#143025] transition">Contact Us</Link>
            </div>
          </div>
          <form className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-2xl p-8 md:p-10 shadow-[0_3px_20px_rgba(42,39,36,0.03)] space-y-5" onSubmit={e=>{e.preventDefault();alert("Thank you. We will reach out shortly.");}}>
            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="First Name" required />
              <input className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="Last Name" />
            </div>
            <input type="email" className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="Email Address" required />
            <textarea className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] h-32 focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="How can we help you?" />
            <button className="w-full bg-[#1a3325] text-white font-bold py-3.5 rounded-md hover:bg-[#143025] transition shadow-md shadow-[#1a3325]/8">Send Message</button>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
