"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePortal } from "@/lib/usePortal";
import { Upload, Download, FileText, Image as ImageIcon } from "lucide-react";

export default function TherapistDocuments() {
  const { data, loading: authLoading } = usePortal("therapist");
  const [docs, setDocs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contextClientId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("clientId") || "");
  const [selectedClient, setSelectedClient] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("clientId") || "");
  const [category, setCategory] = useState("general");
  const fileRef = useRef<HTMLInputElement>(null);

  function loadDocs(targetPage = 1, append = false) {
    const params = new URLSearchParams({ page: String(targetPage), limit: "20" });
    if (contextClientId) params.set("clientId", contextClientId);
    fetch(`/api/portal/documents?${params}`).then(async (r) => ({ r, d: await r.json() })).then(({ r, d }) => {
      if (!r.ok) { setError(d.error || "Unable to load documents."); setDocs([]); setTotal(0); }
      else { setDocs((current) => append ? [...current, ...(d.documents || [])] : (d.documents || [])); setPage(targetPage); setTotal(d.total || 0); }
      setLoading(false); setLoadingMore(false);
    }).catch(() => { setError("Unable to load documents."); setLoading(false); setLoadingMore(false); });
  }

  useEffect(() => {
    if (!data) return;
    fetch("/api/portal/clients?limit=50").then(r => r.json()).then(d => setClients(d.clients || []));
  }, [data]);

  useEffect(() => {
    if (data) loadDocs();
  }, [data, contextClientId]);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !selectedClient) { setError("Select a client and file."); return; }
    setError(""); setSuccess(""); setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("clientId", selectedClient);
    form.append("category", category);
    const res = await fetch("/api/portal/documents", { method: "POST", body: form });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Upload failed"); } else { setSuccess("Document uploaded."); if (fileRef.current) fileRef.current.value = ""; loadDocs(); }
    setUploading(false);
  }

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading…</div>;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8"><div><h1 className="font-serif text-2xl font-medium text-[#1a3325]">Documents</h1>{contextClientId && <p className="text-sm text-[#5a554d] mt-1">Showing documents for the selected client.</p>}</div>{contextClientId && <Link href={`/therapist/clients/${contextClientId}`} className="text-sm font-bold text-[#1a3325] hover:underline">Back to Client</Link>}</div>

      {/* Upload */}
      <div className="bg-white border border-[#e5e0d6] rounded-xl p-6 mb-8">
        <h2 className="font-medium text-[#1a3325] mb-4">Upload Document for Client</h2>
        <div className="space-y-3">
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-[#f8f6f2] border border-[#ddd9cf] text-sm">
            <option value="">Select client…</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-[#f8f6f2] border border-[#ddd9cf] text-sm">
            <option value="general">General</option><option value="forms">Forms</option><option value="reports">Reports</option><option value="other">Other</option>
          </select>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="w-full text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
          <button onClick={handleUpload} disabled={uploading} className="bg-[#1a3325] text-white font-bold py-2.5 px-5 rounded-md hover:bg-[#143025] transition disabled:opacity-50 text-sm flex items-center gap-2"><Upload size={14} /> {uploading ? "Uploading…" : "Upload"}</button>
        </div>
      </div>

      {/* List */}
      {docs.length === 0 ? <p className="text-[15px] text-[#5a554d]">No documents yet.</p> : (
        <div className="space-y-3">
          {docs.map((d: any) => (
            <div key={d.id} className="bg-white border border-[#e5e0d6] rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {d.mimeType?.startsWith("image/") ? <ImageIcon size={20} className="text-[#8a7e6a] shrink-0" /> : <FileText size={20} className="text-[#8a7e6a] shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium text-[#1a3325] truncate">{d.fileName}</p>
                  <p className="text-xs text-[#8a7e6a]">{d.clientName} · {d.uploaderName} · {(Number(d.fileSize) / 1024).toFixed(0)} KB · {new Date(d.createdAt).toLocaleDateString("en-KE")}</p>
                </div>
              </div>
              <a href={`/api/portal/documents/${d.id}`} className="text-[#1a3325] hover:text-[#143025] shrink-0"><Download size={18} /></a>
            </div>
          ))}
        </div>
      )}
      {docs.length < total && <div className="mt-5 text-center"><button onClick={() => { setLoadingMore(true); loadDocs(page + 1, true); }} disabled={loadingMore} className="text-sm font-bold text-[#1a3325] underline disabled:opacity-50">{loadingMore ? "Loading…" : "Load more documents"}</button></div>}
    </div>
  );
}
