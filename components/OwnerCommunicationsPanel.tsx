'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Staff = { id: string; full_name?: string | null; email?: string | null; role?: string | null };
type Receipt = {
  sent: number;
  delivered: number;
  read: number;
  unread: number;
  readNames: string[];
  unreadNames: string[];
  recipientNames: string[];
};
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
  receipt?: Receipt;
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
      <section className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f3] pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#52738f]">Owner control</div>
            <h2 className="mt-1 text-xl font-bold text-[#172b3a]">Send to your team</h2>
          </div>
          <div className="flex rounded-lg border border-[#d7e0e8] bg-[#f4f6f8] p-1">
            <button onClick={() => setMode('broadcast')} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${mode === 'broadcast' ? 'bg-white text-[#102a43] shadow-sm' : 'text-[#687988] hover:text-[#32485b]'}`}>Team feed</button>
            <button onClick={() => setMode('private')} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${mode === 'private' ? 'bg-white text-[#102a43] shadow-sm' : 'text-[#687988] hover:text-[#32485b]'}`}>Private</button>
          </div>
        </div>

        {mode === 'private' && (
          <label className="mt-5 block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#687988]">Staff member</span>
            <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="w-full rounded-lg border border-[#ccd5de] bg-white px-4 py-3 text-sm font-medium text-[#263b4c] outline-none focus:border-[#2563a9] focus:ring-2 focus:ring-[#2563a9]/10">
              {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || 'Staff'} · {person.role || 'staff'}</option>)}
            </select>
          </label>
        )}

        <label className="mt-5 block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#687988]">Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder={mode === 'private' ? 'Private message title' : 'Feed announcement title'} className="w-full rounded-lg border border-[#ccd5de] bg-white px-4 py-3 text-sm font-medium text-[#263b4c] outline-none focus:border-[#2563a9] focus:ring-2 focus:ring-[#2563a9]/10" />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#687988]">Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={8} placeholder="Write your message to staff…" className="w-full resize-y rounded-lg border border-[#ccd5de] bg-white px-4 py-3 text-sm leading-6 text-[#263b4c] outline-none focus:border-[#2563a9] focus:ring-2 focus:ring-[#2563a9]/10" />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button disabled={busy || !title.trim() || !message.trim() || (mode === 'private' && !recipientId)} onClick={send} className="rounded-lg border border-[#102a43] bg-[#102a43] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#173a5e] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'Sending…' : mode === 'private' ? 'Send private message' : 'Send team feed'}
          </button>
          <span className="text-xs font-medium text-[#748391]">{mode === 'broadcast' ? `${staff.length} active staff will receive it.` : 'Only the selected staff member receives it.'}</span>
        </div>

        {status && <div className="mt-4 rounded-lg border border-[#cbd8e3] bg-[#edf3f8] px-4 py-3 text-sm font-semibold text-[#315e82]">{status}</div>}
      </section>

      <section className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-[#edf0f3] pb-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#52738f]">Do / undo / track</div>
          <h2 className="mt-1 text-xl font-bold text-[#172b3a]">Recent owner sends</h2>
          <p className="mt-2 text-sm text-[#687988]">Track readership and retract a send when necessary. Read receipts update when staff mark the notification as read.</p>
        </div>

        <div className="mt-5 space-y-3">
          {actions.map((action) => {
            const names = action.metadata?.recipient_names ?? [];
            const isRetracted = retracted.has(action.id);
            const receipt = action.receipt;
            const total = receipt?.sent ?? names.length;
            const read = receipt?.read ?? 0;
            const unreadNames = receipt?.unreadNames ?? [];
            const allRead = total > 0 && read >= total;
            const privateMessage = action.metadata?.mode === 'private';

            return (
              <article key={action.id} className={`rounded-xl border p-4 ${isRetracted ? 'border-[#d7e0e8] bg-[#f4f6f8] opacity-75' : 'border-[#e0e6eb] bg-[#fafbfc]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#748391]">{privateMessage ? 'Private message' : 'Team feed'}</div>
                      {isRetracted && <span className="rounded-full border border-[#d7e0e8] bg-white px-2 py-1 text-[8px] font-bold uppercase tracking-[0.05em] text-[#687988]">Retracted</span>}
                      {!isRetracted && total > 0 && <span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.05em] ${allRead ? 'border-[#c5e2d3] bg-[#edf7f2] text-[#157347]' : 'border-[#ead9a9] bg-[#fff5dc] text-[#946200]'}`}>{privateMessage ? (allRead ? 'Read' : 'Unread') : `${read}/${total} read`}</span>}
                    </div>
                    <div className="mt-1 font-semibold text-[#263b4c]">{action.metadata?.title || 'Owner message'}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#687988]">{action.metadata?.message}</p>

                    {!isRetracted && receipt && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-[#d7e0e8] bg-white px-3 py-2">
                          <div className="text-[8px] font-bold uppercase tracking-[0.06em] text-[#748391]">Sent</div>
                          <div className="mt-0.5 text-sm font-bold tabular-nums text-[#172b3a]">{receipt.sent}</div>
                        </div>
                        <div className="rounded-lg border border-[#c5e2d3] bg-[#edf7f2] px-3 py-2">
                          <div className="text-[8px] font-bold uppercase tracking-[0.06em] text-[#157347]">Read</div>
                          <div className="mt-0.5 text-sm font-bold tabular-nums text-[#172b3a]">{receipt.read}</div>
                        </div>
                        <div className="rounded-lg border border-[#ead9a9] bg-[#fff5dc] px-3 py-2">
                          <div className="text-[8px] font-bold uppercase tracking-[0.06em] text-[#946200]">Unread</div>
                          <div className="mt-0.5 text-sm font-bold tabular-nums text-[#172b3a]">{receipt.unread}</div>
                        </div>
                      </div>
                    )}

                    {!isRetracted && unreadNames.length > 0 && <div className="mt-3 rounded-lg border border-[#ead9a9] bg-[#fff9ea] px-3 py-2 text-[11px] font-medium text-[#815700]">Waiting on: {unreadNames.join(', ')}</div>}

                    <div className="mt-3 text-[11px] font-medium text-[#8492a0]">{names.length ? names.join(', ') : 'Staff'} · {new Date(action.created_at).toLocaleString()}</div>
                  </div>
                  {isRetracted ? (
                    <span className="shrink-0 rounded-lg border border-[#d7e0e8] bg-white px-3 py-2 text-xs font-semibold text-[#687988]">Undone</span>
                  ) : (
                    <button disabled={undoing === action.id} onClick={() => undo(action.id)} className="shrink-0 rounded-lg border border-[#efc4bf] bg-[#fcecea] px-3 py-2 text-xs font-semibold text-[#b42318] transition hover:bg-[#f8dedb] disabled:opacity-50">{undoing === action.id ? 'Undoing…' : 'Undo send'}</button>
                  )}
                </div>
              </article>
            );
          })}
          {!actions.length && <div className="rounded-xl border border-dashed border-[#ccd5de] bg-[#fafbfc] p-6 text-sm font-medium text-[#8492a0]">No owner messages sent yet.</div>}
        </div>
      </section>
    </div>
  );
}
