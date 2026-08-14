'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Staff = { id: string; full_name?: string | null; email?: string | null; role?: string | null };
type Controls = { teamFeed: boolean; privateMessages: boolean };

export default function FloatingMessenger({ owner }: { owner: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [controls, setControls] = useState<Controls>({ teamFeed: true, privateMessages: true });
  const [mode, setMode] = useState<'private' | 'broadcast'>('private');
  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!owner || !open || staff.length) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/owner/communications', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load messenger');
        if (cancelled) return;
        setStaff(body.staff ?? []);
        setControls(body.controls ?? { teamFeed: true, privateMessages: true });
        setRecipientId(body.staff?.[0]?.id ?? '');
        if (body.controls?.privateMessages === false && body.controls?.teamFeed !== false) setMode('broadcast');
      })
      .catch((error) => !cancelled && setStatus(error instanceof Error ? error.message : 'Could not load messenger'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [owner, open, staff.length]);

  async function send() {
    if (!title.trim() || !message.trim() || (mode === 'private' && !recipientId)) return;
    setSending(true);
    setStatus('');
    try {
      const response = await fetch('/api/owner/communications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, recipientId, title, message }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not send message');
      setTitle('');
      setMessage('');
      setStatus(mode === 'private' ? 'Message sent.' : `Sent to ${body.recipients} staff.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  if (!owner) {
    return <Link href="/inbox" aria-label="Open messages" title="Messages" className="fixed bottom-[5.9rem] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#102a43] text-2xl text-white shadow-[0_12px_32px_rgba(15,23,42,.28)] ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:bg-[#173f5f] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 lg:bottom-6 lg:right-7">✉</Link>;
  }

  return <>
    {open && <button aria-label="Close messenger" className="fixed inset-0 z-[54] bg-slate-950/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />}
    {open && <section className="fixed bottom-[6.1rem] right-3 z-[55] w-[calc(100vw-1.5rem)] max-w-[390px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl lg:bottom-24 lg:right-7">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">WorkflowOS messenger</div><div className="text-base font-black text-slate-950">Message staff</div></div>
        <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-sm font-bold text-slate-500">×</button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        {loading ? <div className="py-8 text-center text-sm font-semibold text-slate-500">Loading messenger…</div> : <>
          <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-slate-100 p-1.5">
            <button disabled={!controls.privateMessages} onClick={() => setMode('private')} className={`rounded-[10px] px-3 py-2 text-xs font-black ${mode === 'private' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'} disabled:opacity-40`}>Private</button>
            <button disabled={!controls.teamFeed} onClick={() => setMode('broadcast')} className={`rounded-[10px] px-3 py-2 text-xs font-black ${mode === 'broadcast' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'} disabled:opacity-40`}>Team feed</button>
          </div>
          {mode === 'private' && <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Staff</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900">{staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || 'Staff'} · {person.role || 'staff'}</option>)}</select></label>}
          <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500" placeholder="Message title" /></label>
          <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={5} className="w-full resize-none rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm leading-5 outline-none focus:border-blue-500" placeholder="Write your message…" /></label>
          <button disabled={sending || !title.trim() || !message.trim() || (mode === 'private' && !recipientId)} onClick={send} className="mt-4 w-full rounded-[12px] bg-[#102a43] px-4 py-3 text-sm font-black text-white disabled:opacity-45">{sending ? 'Sending…' : mode === 'private' ? 'Send message' : 'Send to team'}</button>
          {status && <div className="mt-3 rounded-[12px] border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-800">{status}</div>}
          <Link href="/owner-communications" className="mt-3 block text-center text-xs font-black text-[#102a43]">Open full communications →</Link>
        </>}
      </div>
    </section>}
    <button onClick={() => setOpen((value) => !value)} aria-label="Message staff" title="Message staff" className="fixed bottom-[5.9rem] right-4 z-[56] flex h-14 w-14 items-center justify-center rounded-full bg-[#102a43] text-2xl text-white shadow-[0_12px_32px_rgba(15,23,42,.28)] ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:bg-[#173f5f] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 lg:bottom-6 lg:right-7">✉</button>
  </>;
}
