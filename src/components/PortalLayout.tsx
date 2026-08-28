"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Menu, X, LogOut } from "lucide-react";

type NavItem = { label: string; href: string };

export default function PortalLayout({ title, navItems, children }: { title: string; navItems: NavItem[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => { if (open) document.body.style.overflow = "hidden"; else document.body.style.overflow = ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.href = "/auth/login"; }
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-[#f4f2ee]/90 backdrop-blur-xl border-b border-[#ddd8cf]/60 md:hidden">
        <div className="flex items-center justify-between px-6 h-16">
          <span className="font-serif text-lg font-bold text-[#1a3325]">{title}</span>
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 -mr-2 text-[#1a3325]"><Menu size={22} /></button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      <div className={`fixed inset-0 z-[60] bg-[#1a3325]/25 backdrop-blur-sm transition-opacity duration-300 md:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={close} />
      {/* Mobile drawer */}
      <div className={`fixed top-0 right-0 z-[61] h-full w-[min(300px,85vw)] bg-[#f4f2ee] shadow-2xl transition-transform duration-300 ease-out md:hidden flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="flex items-center justify-between px-6 h-16 shrink-0 border-b border-[#ddd8cf]/60">
          <span className="font-serif text-lg font-bold text-[#1a3325]">Menu</span>
          <button onClick={close} aria-label="Close menu" className="p-2 -mr-2 text-[#2a2724]"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-1">
          {navItems.map(n => (
            <Link key={n.href} href={n.href} onClick={close} className={`px-3 py-3 rounded-lg text-[15px] font-medium transition-colors ${pathname === n.href ? "bg-[#1a3325]/10 text-[#1a3325]" : "text-[#5a554d] hover:bg-[#eceae6]"}`}>{n.label}</Link>
          ))}
          <hr className="my-2 border-[#ddd8cf]/50" />
          <button onClick={logout} className="px-3 py-3 rounded-lg text-[15px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"><LogOut size={16} /> Sign Out</button>
        </nav>
      </div>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[#ddd8cf]/60 bg-[#f8f6f2]">
          <div className="px-6 pt-8 pb-6">
            <Link href="/" className="font-serif text-lg font-bold text-[#1a3325]">DIBA Wellness</Link>
            <p className="text-xs text-[#8a7e6a] mt-1">{title}</p>
          </div>
          <nav className="flex-1 px-3 flex flex-col gap-0.5">
            {navItems.map(n => (
              <Link key={n.href} href={n.href} className={`px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${pathname === n.href ? "bg-[#1a3325]/10 text-[#1a3325]" : "text-[#5a554d] hover:bg-[#eceae6]"}`}>{n.label}</Link>
            ))}
          </nav>
          <div className="px-3 pb-6">
            <button onClick={logout} className="w-full px-3 py-2.5 rounded-lg text-[14px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"><LogOut size={14} /> Sign Out</button>
          </div>
        </aside>
        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
