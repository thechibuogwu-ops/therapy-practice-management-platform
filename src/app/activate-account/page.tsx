"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ActivationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "expired" | "used" | "replaced">("loading");
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const validateInvitation = async () => {
      if (!token) {
        await Promise.resolve();
        if (!cancelled) { setState("invalid"); setMessage("This invitation is invalid. Please contact the practice."); }
        return;
      }
      try {
        const res = await fetch(`/api/activate-account?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "valid") { setState("valid"); setFirstName(data.firstName || ""); }
        else { setState(data.status || "invalid"); setMessage(data.message || "This invitation is invalid."); }
      } catch {
        if (!cancelled) { setState("invalid"); setMessage("We could not validate this invitation. Please try again."); }
      }
    };
    void validateInvitation();
    return () => { cancelled = true; };
  }, [token]);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setMessage("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setSubmitting(true); setMessage("");
    const response = await fetch("/api/activate-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, confirmPassword }) });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) { setMessage(data.error || "Unable to activate your account."); return; }
    router.replace(data.redirectTo);
  }

  return <main className="min-h-screen bg-[#f4f2ee] flex items-center justify-center px-6 py-12">
    <div className="w-full max-w-md">
      <Link href="/" className="font-serif text-2xl font-bold text-[#1a3325] block mb-10">DIBA Wellness</Link>
      <section className="bg-white border border-[#e5e0d6] rounded-2xl p-8 md:p-10 shadow-[0_3px_20px_rgba(42,39,36,0.03)]">
        {state === "loading" && <p className="text-[#8a7e6a]">Validating your invitation…</p>}
        {state === "valid" && <>
          <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-2">Welcome, {firstName}</h1>
          <p className="text-sm text-[#5a554d] leading-relaxed mb-7">Your secure practice account is ready. Create a password to activate it and continue to your portal.</p>
          <form onSubmit={activate} className="space-y-5">
            <div><label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Create Password</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" className="w-full px-4 py-3 rounded-lg bg-[#f8f6f2] border border-[#ddd9cf] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15" /><p className="text-xs text-[#8a7e6a] mt-2">Use at least 8 characters.</p></div>
            <div><label htmlFor="confirm" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Confirm Password</label><input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} required autoComplete="new-password" className="w-full px-4 py-3 rounded-lg bg-[#f8f6f2] border border-[#ddd9cf] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15" /></div>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <button disabled={submitting} className="w-full bg-[#1a3325] text-white font-bold py-3.5 rounded-md hover:bg-[#143025] disabled:opacity-50">{submitting ? "Activating…" : "Activate Account"}</button>
          </form>
        </>}
        {state !== "loading" && state !== "valid" && <>
          <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-3">Account Activation</h1>
          <p className="text-sm text-[#5a554d] leading-relaxed mb-6">{message}</p>
          <Link href="/auth/login" className="text-sm font-bold text-[#1a3325] hover:underline">Go to sign in</Link>
        </>}
      </section>
    </div>
  </main>;
}

export default function ActivateAccountPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f2ee] flex items-center justify-center"><p className="text-[#8a7e6a]">Loading…</p></main>}><ActivationForm /></Suspense>;
}
