"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Therapists", href: "/therapists" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#f4f2ee]/90 backdrop-blur-xl border-b border-[#ddd8cf]/60">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between">
          <Link href="/" className="font-serif text-[1.35rem] md:text-[1.6rem] font-bold tracking-tight text-[#1a3325]">
            Light Wellness
          </Link>

          <nav className="hidden md:flex items-center gap-9 text-[14px] font-medium text-[#5c554f] uppercase tracking-wide">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-[#1a3325] transition">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <Link href="/auth/login" className="text-[14px] font-medium text-[#5c554f] hover:text-[#1a3325] transition">
              Client Login
            </Link>
            <Link href="/book" className="text-[14px] font-bold bg-[#1a3325] text-white px-5 py-2.5 rounded hover:bg-[#143025] transition">
              Book Appointment
            </Link>
          </div>

          <button onClick={() => setOpen(true)} className="md:hidden p-2 -mr-2 text-[#1a3325]" aria-label="Open menu">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-[#1a3325]/25 backdrop-blur-sm transition-opacity duration-300 md:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={close}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[61] h-full w-[min(340px,82vw)] bg-[#f4f2ee] shadow-2xl transition-transform duration-300 ease-out md:hidden flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-6 h-[72px] shrink-0 border-b border-[#ddd8cf]/60">
          <span className="font-serif text-xl font-bold text-[#1a3325]">Menu</span>
          <button onClick={close} aria-label="Close menu" className="p-2 -mr-2 text-[#2a2724]">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-10 flex flex-col text-[16px] font-medium text-[#2a2724]">
          <Link href="/" onClick={close} className="py-4 border-b border-[#ddd8cf]/50 hover:text-[#1a3325] transition">Home</Link>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="py-4 border-b border-[#ddd8cf]/50 hover:text-[#1a3325] transition">
              {l.label}
            </Link>
          ))}

          <div className="pt-6 mt-auto flex flex-col gap-3">
            <Link href="/book" onClick={close} className="text-center text-[15px] font-bold bg-[#1a3325] text-white rounded-md py-3 hover:bg-[#143025] transition">
              Book Appointment
            </Link>
            <Link href="/auth/login" onClick={close} className="text-center text-[15px] font-medium text-[#5c554f] border border-[#ddd8cf] rounded-md py-3 hover:border-[#1a3325] transition">
              Client Login
            </Link>
            <Link href="/auth/login" onClick={close} className="text-center text-[15px] font-medium text-[#5c554f] border border-[#ddd8cf] rounded-md py-3 hover:border-[#1a3325] transition">
              Therapist Login
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
