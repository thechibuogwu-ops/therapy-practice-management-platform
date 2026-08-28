"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePortal } from "@/lib/usePortal";
import { FileText, Paperclip, RefreshCw, Send, X } from "lucide-react";

export default function TherapistMessages() {
  const { data, loading: authLoading } = usePortal("therapist");
  const [contacts, setContacts] = useState<any[]>([]);
  const [requestedClientId, setRequestedClientId] = useState<string | null>(null);
  const [queryReady, setQueryReady] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [body, setBody] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true); const [loadingOlder, setLoadingOlder] = useState(false); const [sending, setSending] = useState(false); const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null); const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRequestedClientId(new URLSearchParams(window.location.search).get("clientId"));
    setQueryReady(true);
  }, []);

  const loadMessages = useCallback(async (conversationId: string, before?: string, appendOlder = false) => {
    const params = new URLSearchParams({ conversationId }); if (before) params.set("before", before);
    const response = await fetch(`/api/portal/messages?${params}`, { cache: "no-store" }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load messages.");
    setConversation(payload.conversation); setNextCursor(payload.nextCursor || null); setMessages((current) => appendOlder ? [...(payload.messages || []), ...current] : (payload.messages || []));
  }, []);

  const loadContacts = useCallback(async () => {
    const response = await fetch("/api/portal/messages?limit=50", { cache: "no-store" }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load clients.");
    setContacts(payload.conversations || []); return payload.conversations || [];
  }, []);

  const openContact = useCallback(async (contact: any) => {
    setLoading(true); setError(""); setActive(contact);
    try {
      let conversationId = contact.id;
      if (!conversationId) {
        const response = await fetch("/api/portal/messages/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: contact.clientId }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to start conversation.");
        conversationId = payload.conversation.id;
        contact = { ...contact, id: conversationId };
        setActive(contact);
        setContacts((current) => current.map((item) => item.clientId === contact.clientId ? contact : item));
      }
      await loadMessages(conversationId);
    } catch (e: any) { setError(e.message || "Unable to load conversation."); }
    finally { setLoading(false); }
  }, [loadMessages]);

  useEffect(() => {
    if (!data || !queryReady) return;
    loadContacts().then((items) => {
      if (requestedClientId) {
        const requested = items.find((item: any) => item.clientId === requestedClientId) || { clientId: requestedClientId, clientName: "Client" };
        openContact(requested);
      } else if (items[0]) openContact(items[0]);
      else setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }, [data, queryReady, requestedClientId, loadContacts, openContact]);
  useEffect(() => { if (!conversation?.id) return; const timer = window.setInterval(() => loadMessages(conversation.id).catch(() => {}), 20000); return () => window.clearInterval(timer); }, [conversation?.id, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadOlder() { if (!conversation?.id || !nextCursor) return; setLoadingOlder(true); try { await loadMessages(conversation.id, nextCursor, true); } catch (e: any) { setError(e.message); } finally { setLoadingOlder(false); } }
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault(); const text = body.trim(); if ((!text && !file) || !conversation?.id) return; setSending(true); setError("");
    try {
      let response: Response;
      if (file) { const form = new FormData(); form.append("conversationId", conversation.id); form.append("body", text); form.append("file", file); response = await fetch("/api/portal/messages/attach", { method: "POST", body: form }); }
      else response = await fetch("/api/portal/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversation.id, body: text }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Unable to send message.");
      setMessages((current) => [...current, payload.message]); setBody(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) { setError(e.message || "Unable to send message."); } finally { setSending(false); }
  }

  if (authLoading || loading && !active) return <div className="p-8 text-[#8a7e6a]">Loading private conversations…</div>;
  if (!contacts.length) return <div className="px-6 md:px-10 py-8"><h1 className="font-serif text-2xl font-medium text-[#1a3325] mb-3">Messages</h1><p className="text-sm text-[#5a554d]">No clients are currently assigned to you.</p></div>;

  return <div className="flex h-[calc(100vh-64px)] md:h-screen">
    <aside className="w-64 shrink-0 border-r border-[#e5e0d6] bg-[#f8f6f2] hidden md:flex flex-col"><div className="px-4 py-4 border-b border-[#e5e0d6]"><h2 className="font-medium text-[#1a3325] text-sm">Assigned Clients</h2></div><div className="flex-1 overflow-y-auto">{contacts.map((contact) => <button key={contact.clientId} onClick={() => openContact(contact)} className={`w-full text-left px-4 py-3 border-b border-[#eceae6] transition-colors ${active?.clientId === contact.clientId ? "bg-[#eceae6]" : "hover:bg-[#eceae6]/50"}`}><p className="font-medium text-[#1a3325] text-sm">{contact.clientName}</p>{Number(contact.unreadCount) > 0 && <span className="text-xs text-[#1a3325] font-bold">{contact.unreadCount} new</span>}</button>)}</div></aside>
    <section className="flex-1 flex flex-col min-w-0"><div className="px-6 py-4 border-b border-[#e5e0d6] shrink-0 flex items-center justify-between gap-3"><div><select className="md:hidden w-full mb-2 px-3 py-2 rounded-lg border border-[#ddd9cf] text-sm" value={active?.clientId || ""} onChange={(e) => { const contact = contacts.find((item) => item.clientId === e.target.value); if (contact) openContact(contact); }}>{contacts.map((contact) => <option key={contact.clientId} value={contact.clientId}>{contact.clientName}{Number(contact.unreadCount) ? ` (${contact.unreadCount})` : ""}</option>)}</select><h1 className="font-serif text-lg font-medium text-[#1a3325] hidden md:block">{active?.clientName || "Client"}</h1><p className="text-xs text-[#8a7e6a]">Private current care conversation</p></div><div className="flex items-center gap-3">{requestedClientId && <Link href={`/therapist/clients/${requestedClientId}`} className="text-xs font-bold text-[#1a3325] hover:underline">Back to Client</Link>}<Link href={active?.clientId ? `/therapist/documents?clientId=${active.clientId}` : "/therapist/documents"} className="text-xs font-bold text-[#1a3325] hover:underline">Documents</Link><button onClick={() => conversation?.id && loadMessages(conversation.id).catch((e) => setError(e.message))} aria-label="Refresh messages" className="text-[#8a7e6a] hover:text-[#1a3325]"><RefreshCw size={17}/></button></div></div>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">{nextCursor && <div className="text-center"><button onClick={loadOlder} disabled={loadingOlder} className="text-xs font-bold text-[#1a3325] underline disabled:opacity-50">{loadingOlder ? "Loading…" : "Load older messages"}</button></div>}{messages.map((message) => <div key={message.id} className={`max-w-[82%] ${message.senderId === data?.user?.id ? "ml-auto" : ""}`}><div className={`rounded-xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${message.senderId === data?.user?.id ? "bg-[#1a3325] text-white" : "bg-white border border-[#e5e0d6] text-[#2a2724]"}`}>{message.body}{message.attachments?.map((attachment:any) => <a key={attachment.id} href={`/api/portal/messages/attachment/${attachment.id}`} className={`flex items-center gap-2 mt-2 text-sm underline ${message.senderId === data?.user?.id ? "text-white/85" : "text-[#1a3325]"}`}><FileText size={14}/>{attachment.fileName} ({Math.ceil(attachment.fileSize/1024)} KB)</a>)}</div><p className={`text-[10px] mt-1 ${message.senderId===data?.user?.id?"text-right":""} text-[#8a7e6a]`}>{new Date(message.createdAt).toLocaleString("en-KE", {dateStyle:"short",timeStyle:"short"})}</p></div>)}<div ref={endRef}/></div>
      {error && <div className="px-6 py-2 text-sm text-red-600">{error}</div>}{file && <div className="px-6 py-2 flex items-center gap-2 text-sm text-[#1a3325] bg-[#eceae6]"><Paperclip size={14}/><span className="truncate">{file.name}</span><button onClick={() => {setFile(null);if(fileRef.current)fileRef.current.value=""}} className="ml-auto text-[#8a7e6a] hover:text-red-600" aria-label="Remove attachment"><X size={14}/></button></div>}
      <form onSubmit={sendMessage} className="px-6 py-4 border-t border-[#e5e0d6] flex gap-3 shrink-0"><input type="file" ref={fileRef} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={(e)=>e.target.files?.[0]&&setFile(e.target.files[0])}/><button type="button" onClick={()=>fileRef.current?.click()} className="text-[#8a7e6a] hover:text-[#1a3325] p-2 shrink-0" aria-label="Attach document"><Paperclip size={18}/></button><input value={body} maxLength={4000} onChange={(e)=>setBody(e.target.value)} placeholder="Type a message…" className="flex-1 px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 transition"/><button type="submit" disabled={sending||(!body.trim()&&!file)} className="bg-[#1a3325] text-white px-4 py-3 rounded-lg hover:bg-[#143025] transition disabled:opacity-50" aria-label="Send message"><Send size={18}/></button></form>
    </section>
  </div>;
}
