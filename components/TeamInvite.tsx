'use client';
import { useState } from 'react';

export default function TeamInvite() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(formData: FormData) {
    setBusy(true); setMessage('');
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch('/api/team/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setMessage(json.error || 'Invite failed');
    else { setMessage('Invite sent.'); window.location.reload(); }
  }
  return <form action={submit} className="mt-6 grid gap-3 rounded-3xl border bg-white p-5 shadow-sm md:grid-cols-5">
    <input name="full_name" required placeholder="Full name" className="rounded-xl border p-3" />
    <input name="email" required type="email" placeholder="Email" className="rounded-xl border p-3" />
    <input name="department" placeholder="Department" className="rounded-xl border p-3" />
    <select name="role" defaultValue="staff" className="rounded-xl border p-3">
      <option value="staff">Staff</option><option value="sales">Sales</option><option value="marketing">Marketing</option><option value="manager">Manager</option><option value="admin">Admin</option>
    </select>
    <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Invite staff'}</button>
    {message && <div className="text-sm text-slate-600 md:col-span-5">{message}</div>}
  </form>;
}
