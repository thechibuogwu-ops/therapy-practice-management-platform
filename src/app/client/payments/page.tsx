"use client";
import { useState, useEffect } from "react";
import { usePortal } from "@/lib/usePortal";

export default function ClientPayments() {
  const { data, loading: authLoading } = usePortal("client");
  const [pays, setPays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data) return;
    fetch("/api/portal/payments").then(r => r.json()).then(d => { setPays(d.payments || []); setLoading(false); }).catch(() => setLoading(false));
  }, [data]);

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-4xl">
      <h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-8">Payments</h1>
      {pays.length === 0 ? <p className="text-[15px] text-[#5a554d]">No payment history.</p> : (
        <div className="space-y-3">
          {pays.map((p: any) => (
            <div key={p.id} className="bg-white border border-[#e5e0d6] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[#1a3325]">KES {Number(p.amountKES).toLocaleString()}</p>
                <p className="text-sm text-[#5a554d]">{p.serviceName || "Session"}{p.appointmentDate ? ` · ${p.appointmentDate}` : ""}</p>
                <p className="text-xs text-[#8a7e6a]">{p.provider} · {p.method || "—"} · {p.transactionRef}</p>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${p.status === "successful" ? "bg-green-50 text-green-700" : p.status === "failed" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
