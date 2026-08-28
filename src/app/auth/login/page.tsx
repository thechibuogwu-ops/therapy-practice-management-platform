"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Login failed");
      const r = data.user.role;
      if (r === "admin") router.push("/admin");
      else if (r === "therapist") router.push("/therapist");
      else router.push("/client");
    } catch {
      setError("Connection error. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-serif text-2xl font-bold text-forest block mb-10">DIBA Wellness</Link>
        <form onSubmit={handleLogin} className="bg-white border border-stone-200/50 rounded-2xl shadow-xl shadow-stone-900/[0.03] p-8 md:p-10 space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-forest mb-1">Welcome back</h1>
            <p className="text-sm text-stone-text/60">Access your secure therapy portal.</p>
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-stone-text/60 mb-2">Email</label>
            <input id="email" type="email" placeholder="you@example.com" className="w-full px-4 py-3 rounded-lg bg-cream border border-stone-200/60 text-stone-text placeholder:text-stone-text/40 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-stone-text/60 mb-2">Password</label>
            <input id="password" type="password" placeholder="Enter your password" className="w-full px-4 py-3 rounded-lg bg-cream border border-stone-200/60 text-stone-text placeholder:text-stone-text/40 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="w-full bg-forest text-white font-bold py-3.5 rounded-lg hover:bg-forest-deep transition shadow-md shadow-forest/10 flex items-center justify-center gap-2">Sign In <ArrowRight size={18} /></button>
          <div className="flex items-start gap-2 text-xs text-stone-text/50">
            <ShieldCheck size={14} className="text-forest shrink-0 mt-0.5" />
            <span>Your data is protected with strict privacy and role-based access controls.</span>
          </div>
        </form>
      </div>
    </main>
  );
}
