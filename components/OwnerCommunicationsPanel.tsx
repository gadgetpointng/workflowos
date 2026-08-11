'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Staff = { id: string; full_name?: string | null; email?: string | null; role?: string | null };
type Action = {
  id: string;
  created_at: string;
  metadata?: {
    mode?: string;
    title?: string;
    message?: string;
    recipient_names?: string[];
    notification_ids?: string[];
  } | null;
};

export default function OwnerCommunicationsPanel({
  staff,
  actions,
  retractedActionIds,
}: {
  staff: Staff[];
  actions: Action[];
  retractedActionIds: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'broadcast' | 'private'>('broadcast');
  const [recipientId, setRecipientId] = useState(staff[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [undoing, setUndoing] = useState<string | null>(null);
  const retracted = new Set(retractedActionIds);

  async function send() {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/owner/communications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, recipientId, title, message }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not send');
      setTitle('');
      setMessage('');
      setStatus(mode === 'private' ? 'Private message sent.' : `Feed sent to ${body.recipients} staff.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  }

  async function undo(actionId: string) {
    setUndoing(actionId);
    setStatus('');
    try {
      const response = await fetch('/api/owner/communications', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not retract');
      setStatus(`Retracted from ${body.retracted} notification${body.retracted === 1 ? '' : 's'}.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not retract');
    } finally {
      setUndoing(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Owner control</div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Send to your team</h2>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button onClick={() => setMode('broadcast')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'broadcast' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>Team feed</button>
            <button onClick={() => setMode('private')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'private' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500'}`}>Private</button>
          </div>
        </div>

        {mode === 'private' && (
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Staff member</span>
            <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-400">
              {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || 'Staff'} · {person.role || 'staff'}</option>)}
            </select>
          </label>
        )}

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder={mode === 'private' ? 'Private message title' : 'Feed announcement title'} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-400" />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={8} placeholder="Write your message to staff…" className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-violet-400" />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button disabled={busy || !title.trim() || !message.trim() || (mode === 'private' && !recipientId)} onClick={send} className="rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'Sending…' : mode === 'private' ? 'Send private message' : 'Send feed notification'}
          </button>
          <span className="text-xs font-semibold text-slate-500">{mode === 'broadcast' ? `${staff.length} active staff will receive it.` : 'Only the selected staff member receives it.'}</span>
        </div>

        {status && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{status}</div>}
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Do / undo</div>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Recent owner sends</h2>
        <p className="mt-2 text-sm text-slate-500">Retract removes the generated staff notifications and records the reversal in the audit log.</p>

        <div className="mt-5 space-y-3">
          {actions.map((action) => {
            const names = action.metadata?.recipient_names ?? [];
            const isRetracted = retracted.has(action.id);
            return (
              <article key={action.id} className={`rounded-2xl border p-4 ${isRetracted ? 'border-slate-200 bg-slate-100/80 opacity-75' : 'border-slate-100 bg-slate-50/70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{action.metadata?.mode === 'private' ? 'Private message' : 'Team feed'}</div>
                      {isRetracted && <span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">Retracted</span>}
                    </div>
                    <div className="mt-1 font-black text-slate-950">{action.metadata?.title || 'Owner message'}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{action.metadata?.message}</p>
                    <div className="mt-2 text-[11px] font-semibold text-slate-400">{names.length ? names.join(', ') : 'Staff'} · {new Date(action.created_at).toLocaleString()}</div>
                  </div>
                  {isRetracted ? (
                    <span className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500">Undone</span>
                  ) : (
                    <button disabled={undoing === action.id} onClick={() => undo(action.id)} className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">{undoing === action.id ? 'Undoing…' : 'Undo send'}</button>
                  )}
                </div>
              </article>
            );
          })}
          {!actions.length && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-medium text-slate-500">No owner messages sent yet.</div>}
        </div>
      </section>
    </div>
  );
}
