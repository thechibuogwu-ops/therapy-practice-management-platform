"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePortal } from "@/lib/usePortal";
import { FileText, Paperclip, RefreshCw, Send, X } from "lucide-react";

export default function ClientMessages() {
  const { data, loading: authLoading } = usePortal("client");
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async (conversationId: string, before?: string, appendOlder = false) => {
    const params = new URLSearchParams({ conversationId });
    if (before) params.set("before", before);
    const response = await fetch(`/api/portal/messages?${params}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load messages.");
    setConversation(payload.conversation);
    setNextCursor(payload.nextCursor || null);
    setMessages((current) => appendOlder ? [...(payload.messages || []), ...current] : (payload.messages || []));
  }, []);

  const startConversation = useCallback(async () => {
    if (!data) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/portal/messages/conversation", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to start conversation.");
      await loadMessages(payload.conversation.id);
    } catch (e: any) { setError(e.message || "Unable to load messages."); }
    finally { setLoading(false); }
  }, [data, loadMessages]);

  useEffect(() => { if (data) startConversation(); }, [data, startConversation]);
  useEffect(() => {
    if (!conversation?.id) return;
    const timer = window.setInterval(() => loadMessages(conversation.id).catch(() => {}), 20000);
    return () => window.clearInterval(timer);
  }, [conversation?.id, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadOlder() {
    if (!conversation?.id || !nextCursor) return;
    setLoadingOlder(true); setError("");
    try { await loadMessages(conversation.id, nextCursor, true); }
    catch (e: any) { setError(e.message || "Unable to load older messages."); }
    finally { setLoadingOlder(false); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if ((!text && !file) || !conversation?.id) return;
    setSending(true); setError("");
    try {
      let response: Response;
      if (file) {
        const form = new FormData();
        form.append("conversationId", conversation.id); form.append("body", text); form.append("file", file);
        response = await fetch("/api/portal/messages/attach", { method: "POST", body: form });
      } else {
        response = await fetch("/api/portal/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversation.id, body: text }) });
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to send message.");
      setMessages((current) => [...current, payload.message]);
      setBody(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) { setError(e.message || "Unable to send message."); }
    finally { setSending(false); }
  }

  if (authLoading || loading) return <div className="p-8 text-[#8a7e6a]">Loading private conversation…</div>;
  if (error && !conversation) return <div className="px-6 md:px-10 py-8"><h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-3">Messages</h1><p className="text-sm text-red-600">{error}</p><button onClick={startConversation} className="mt-4 text-sm font-bold text-[#1a3325] underline">Try again</button></div>;

  return <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">
    <div className="px-6 py-4 border-b border-[#e5e0d6] shrink-0 flex items-center justify-between gap-3">
      <div><h1 className="font-serif text-lg font-medium text-[#1a3325]">{conversation?.partnerName || "My Therapist"}</h1><p className="text-xs text-[#8a7e6a]">Private conversation with your assigned therapist</p></div>
      <div className="flex items-center gap-3"><Link href="/client/documents" className="text-xs font-bold text-[#1a3325] hover:underline">Documents</Link><button onClick={() => conversation?.id && loadMessages(conversation.id).catch((e) => setError(e.message))} aria-label="Refresh messages" className="text-[#8a7e6a] hover:text-[#1a3325]"><RefreshCw size={17} /></button></div>
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {nextCursor && <div className="text-center"><button onClick={loadOlder} disabled={loadingOlder} className="text-xs font-bold text-[#1a3325] underline disabled:opacity-50">{loadingOlder ? "Loading…" : "Load older messages"}</button></div>}
      {messages.map((message) => <div key={message.id} className={`max-w-[82%] ${message.senderId === data?.user?.id ? "ml-auto" : ""}`}>
        <div className={`rounded-xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${message.senderId === data?.user?.id ? "bg-[#1a3325] text-white" : "bg-white border border-[#e5e0d6] text-[#2a2724]"}`}>{message.body}
          {message.attachments?.map((attachment: any) => <a key={attachment.id} href={`/api/portal/messages/attachment/${attachment.id}`} className={`flex items-center gap-2 mt-2 text-sm underline ${message.senderId === data?.user?.id ? "text-white/85" : "text-[#1a3325]"}`}><FileText size={14} />{attachment.fileName} ({Math.ceil(attachment.fileSize / 1024)} KB)</a>)}
        </div>
        <p className={`text-[10px] mt-1 ${message.senderId === data?.user?.id ? "text-right" : ""} text-[#8a7e6a]`}>{new Date(message.createdAt).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })}{message.senderId === data?.user?.id && !message.read ? " · Sent" : ""}</p>
      </div>)}
      <div ref={endRef} />
    </div>
    {error && <div className="px-6 py-2 text-sm text-red-600">{error}</div>}
    {file && <div className="px-6 py-2 flex items-center gap-2 text-sm text-[#1a3325] bg-[#eceae6]"><Paperclip size={14}/><span className="truncate">{file.name}</span><button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="ml-auto text-[#8a7e6a] hover:text-red-600" aria-label="Remove attachment"><X size={14}/></button></div>}
    <form onSubmit={sendMessage} className="px-6 py-4 border-t border-[#e5e0d6] flex gap-3 shrink-0">
      <input type="file" ref={fileRef} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
      <button type="button" onClick={() => fileRef.current?.click()} className="text-[#8a7e6a] hover:text-[#1a3325] p-2 shrink-0" aria-label="Attach document"><Paperclip size={18}/></button>
      <input value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" className="flex-1 px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition" />
      <button type="submit" disabled={sending || (!body.trim() && !file)} className="bg-[#1a3325] text-white px-4 py-3 rounded-lg hover:bg-[#143025] transition disabled:opacity-50" aria-label="Send message"><Send size={18}/></button>
    </form>
  </div>;
}
