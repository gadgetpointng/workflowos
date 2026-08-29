'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StaffAdminChat from '@/components/StaffAdminChat';

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
    setStatus('');
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

  if (!owner) return <StaffAdminChat />;

  return <>
    {open && <button aria-label="Close messenger" className="fixed inset-0 z-[54] bg-[#08111f]/20" onClick={() => setOpen(false)} />}
    {open && <section className="fixed bottom-[6.1rem] right-3 z-[55] w-[calc(100vw-1.5rem)] max-w-[400px] overflow-hidden rounded-[8px] border border-[#e4e7ec] bg-white shadow-2xl lg:bottom-24 lg:right-7">
      <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-[#08111f] px-4 py-3 text-white">
        <div><div className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9fb2c8]">GadgetPoint</div><div className="text-sm font-bold">Messages</div></div>
        <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-lg">×</button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto bg-[#f5f6f8] p-4">
        {loading ? <div className="py-8 text-center text-xs font-semibold text-[#697586]">Loading messages…</div> : <>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-[#e4e7ec] bg-white p-1">
            <button disabled={!controls.privateMessages} onClick={() => setMode('private')} className={`rounded px-3 py-2 text-xs font-semibold ${mode === 'private' ? 'bg-[#2377ff] text-white' : 'text-[#697586]'} disabled:opacity-40`}>Private</button>
            <button disabled={!controls.teamFeed} onClick={() => setMode('broadcast')} className={`rounded px-3 py-2 text-xs font-semibold ${mode === 'broadcast' ? 'bg-[#2377ff] text-white' : 'text-[#697586]'} disabled:opacity-40`}>Team</button>
          </div>
          {mode === 'private' && <label className="mt-3 block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Staff member</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="w-full rounded-md border border-[#e4e7ec] bg-white px-3 py-2.5 text-sm text-[#111827]">{staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || 'Staff'} · {person.role || 'staff'}</option>)}</select></label>}
          <label className="mt-3 block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Subject</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} className="w-full rounded-md border border-[#e4e7ec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2377ff]" placeholder="Message subject" /></label>
          <label className="mt-3 block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#697586]">Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={5} className="w-full resize-none rounded-md border border-[#e4e7ec] bg-white px-3 py-2.5 text-sm leading-5 outline-none focus:border-[#2377ff]" placeholder="Write a message…" /></label>
          <button disabled={sending || !title.trim() || !message.trim() || (mode === 'private' && !recipientId)} onClick={send} className="mt-3 w-full rounded-md bg-[#2377ff] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1767e8] disabled:opacity-45">{sending ? 'Sending…' : mode === 'private' ? 'Send message' : 'Send to team'}</button>
          {status && <div className="mt-3 rounded-md border border-[#cfe0ff] bg-[#edf5ff] px-3 py-2 text-xs font-semibold text-[#175fc7]">{status}</div>}
          <Link href="/owner-communications" className="mt-3 block text-center text-xs font-semibold text-[#2377ff]">Open full messages →</Link>
        </>}
      </div>
    </section>}
    <button onClick={() => setOpen((value) => !value)} aria-label="Message staff" title="Message staff" className="fixed bottom-[5.9rem] right-4 z-[56] flex h-14 w-14 items-center justify-center rounded-full bg-[#2377ff] text-xl text-white shadow-[0_10px_28px_rgba(35,119,255,.3)] transition hover:-translate-y-0.5 hover:bg-[#1767e8] lg:bottom-6 lg:right-7">✉</button>
  </>;
}
