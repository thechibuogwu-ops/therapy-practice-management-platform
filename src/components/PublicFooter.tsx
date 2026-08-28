import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="bg-[#1a3325] text-[#b5a898]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 grid md:grid-cols-4 gap-12 md:gap-8">
        <div className="md:col-span-1">
          <Link href="/" className="font-serif text-2xl font-bold text-white">DIBA Wellness</Link>
          <p className="text-sm text-[#b5a898]/75 mt-5 leading-relaxed">
            A private therapy practice based in Nairobi, providing confidential mental health care.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-5 text-[13px] uppercase tracking-wider">Explore</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><Link href="/services" className="hover:text-white transition-colors">Services</Link></li>
            <li><Link href="/therapists" className="hover:text-white transition-colors">Therapists</Link></li>
            <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-5 text-[13px] uppercase tracking-wider">Patient Care</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/book" className="hover:text-white transition-colors">Book an Appointment</Link></li>
            <li><Link href="/auth/login" className="hover:text-white transition-colors">Client Login</Link></li>
            <li><Link href="/auth/login" className="hover:text-white transition-colors">Therapist Login</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-5 text-[13px] uppercase tracking-wider">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li><a href="mailto:hello@diba.co.ke" className="hover:text-white transition-colors">hello@diba.co.ke</a></li>
            <li><a href="tel:+254712345678" className="hover:text-white transition-colors">+254 712 345 678</a></li>
            <li>Nairobi, Kenya</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-6 border-t border-white/10 text-xs text-[#b5a898]/40 flex flex-col md:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} DIBA Holistic Wellness Care. All rights reserved.</p>
        <p>Built with care for privacy-first healthcare.</p>
      </div>
    </footer>
  );
}
