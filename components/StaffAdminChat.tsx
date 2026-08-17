'use client';

import { useEffect, useMemo, useState } from 'react';

type Message = {
  id: number;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};

type ChatData = {
  staff?: { email: string; fullName: string; role: string };
  admin?: { email: string; fullName: string; role: string };
  unread?: number;
  messages?: Message[];
  error?: string;
};

export default function StaffAdminChat() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState<ChatData>({ messages: [], unread: 0 });
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');

  const unread = Number(data.unread ?? 0);
  const staffEmail = data.staff?.email ?? '';
  const messages = useMemo(() => data.messages ?? [], [data.messages]);

  async function load(markRead = false) {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-chat', { cache: 'no-store' });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || 'Could not load Admin chat');
      setData(next);
      setStatus('');
      if (markRead && Number(next.unread ?? 0) > 0) {
        await fetch('/api/admin-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'read' }),
        });
        setData((current) => ({ ...current, unread: 0 }));
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load Admin chat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    const timer = window.setInterval(() => load(open), 20_000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (open) load(true);
  }, [open]);

  async function send() {
    const message = body.trim();
    if (!message || sending) return;
    setSending(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'send', body: message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send message');
      setBody('');
      await load(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  return <>
    {open && <button aria-label="Close Admin chat" className="fixed inset-0 z-[54] bg-[#08111f]/20" onClick={() => setOpen(false)} />}
    {open && <section className="fixed bottom-[6.1rem] right-3 z-[55] flex h-[min(70vh,620px)] w-[calc(100vw-1.5rem)] max-w-[410px] flex-col overflow-hidden rounded-[10px] border border-[#dfe5eb] bg-white shadow-2xl lg:bottom-24 lg:right-7">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#08111f] px-4 py-3 text-white">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9fb2c8]">GadgetPoint</div>
          <div className="text-sm font-bold">Chat with Admin</div>
          <div className="mt-0.5 text-[10px] text-[#b9c7d6]">GADGETPOINT · Owner/Admin</div>
        </div>
        <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-lg">×</button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f5f6f8] p-4">
        {loading && !messages.length ? <div className="py-10 text-center text-xs font-semibold text-[#697586]">Loading chat…</div> : null}
        {!loading && !messages.length && !status ? <div className="rounded-lg border border-dashed border-[#ccd5de] bg-white p-5 text-center text-sm text-[#697586]">No messages yet. Send Admin a message to start the conversation.</div> : null}
        {messages.map((message) => {
          const mine = message.senderEmail === staffEmail;
          return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2.5 shadow-sm ${mine ? 'bg-[#2377ff] text-white' : 'border border-[#e1e6eb] bg-white text-[#172b3a]'}`}>
              <div className={`mb-1 text-[9px] font-bold uppercase tracking-[.06em] ${mine ? 'text-blue-100' : 'text-[#52738f]'}`}>{mine ? 'You' : 'Admin'}</div>
              <div className="whitespace-pre-wrap text-sm leading-5">{message.body}</div>
              <div className={`mt-1.5 text-[9px] ${mine ? 'text-blue-100' : 'text-[#8492a0]'}`}>{new Date(message.createdAt).toLocaleString()}</div>
            </div>
          </div>;
        })}
      </div>

      <div className="border-t border-[#e4e7ec] bg-white p-3">
        {status && <div className="mb-2 rounded-md border border-[#f2c7c2] bg-[#fff3f1] px-3 py-2 text-xs font-semibold text-[#b42318]">{status}</div>}
        <div className="flex items-end gap-2">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} maxLength={1200} rows={2} className="min-h-[44px] flex-1 resize-none rounded-lg border border-[#dfe5eb] px-3 py-2 text-sm outline-none focus:border-[#2377ff]" placeholder="Message Admin…" />
          <button onClick={send} disabled={sending || !body.trim()} className="h-11 rounded-lg bg-[#2377ff] px-4 text-sm font-bold text-white hover:bg-[#1767e8] disabled:opacity-45">{sending ? '…' : 'Send'}</button>
        </div>
      </div>
    </section>}

    <button onClick={() => setOpen((value) => !value)} aria-label="Chat with Admin" title="Chat with Admin" className="fixed bottom-[5.9rem] right-4 z-[56] flex h-14 w-14 items-center justify-center rounded-full bg-[#2377ff] text-xl text-white shadow-[0_10px_28px_rgba(35,119,255,.3)] transition hover:-translate-y-0.5 hover:bg-[#1767e8] lg:bottom-6 lg:right-7">
      ✉
      {unread > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#b42318] px-1 text-[10px] font-bold leading-none text-white">{unread > 99 ? '99+' : unread}</span>}
    </button>
  </>;
}
