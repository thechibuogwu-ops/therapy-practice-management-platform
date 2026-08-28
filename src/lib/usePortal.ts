"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function usePortal(expectedRole: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/portal/me")
      .then(r => { if (!r.ok) throw new Error("Unauthorized"); return r.json(); })
      .then(d => {
        if (d.role !== expectedRole) { router.replace("/auth/login"); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { router.replace("/auth/login"); });
  }, [expectedRole, router]);

  return { data, loading };
}
