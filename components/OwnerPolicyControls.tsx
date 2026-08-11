'use client';

import { useState } from 'react';

type OwnerPolicies = {
  teamFeed: boolean;
  privateMessages: boolean;
  readReceipts: boolean;
  messageRetraction: boolean;
};

type PolicyKey = keyof OwnerPolicies;

const policyRows: { key: PolicyKey; title: string; note: string }[] = [
  {
    key: 'teamFeed',
    title: 'Team feed',
    note: 'Yes allows the owner to broadcast one message to all active staff. No disables team-wide sending.',
  },
  {
    key: 'privateMessages',
    title: 'Private staff messages',
    note: 'Yes allows direct owner-to-staff messages. No disables private sending.',
  },
  {
    key: 'readReceipts',
    title: 'Message read receipts',
    note: 'Yes shows who has read owner messages and who is still pending. No hides read tracking.',
  },
  {
    key: 'messageRetraction',
    title: 'Message retraction',
    note: 'Yes allows the owner to retract a sent notification. No removes the retract action from owner controls.',
  },
];

export default function OwnerPolicyControls({ initialPolicies }: { initialPolicies: OwnerPolicies }) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [saving, setSaving] = useState<PolicyKey | null>(null);
  const [status, setStatus] = useState('');

  async function toggle(key: PolicyKey, enabled: boolean) {
    const previous = policies[key];
    setPolicies((current) => ({ ...current, [key]: enabled }));
    setSaving(key);
    setStatus('');

    try {
      const response = await fetch('/api/owner/policies', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save control');
      setStatus(`${enabled ? 'Yes' : 'No'} saved.`);
    } catch (error) {
      setPolicies((current) => ({ ...current, [key]: previous }));
      setStatus(error instanceof Error ? error.message : 'Could not save control');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Owner yes / no controls</div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Turn business controls on or off</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Use these like iPhone switches. Green means Yes / On. Grey means No / Off. Changes apply to the organization, not only this browser.</p>
        </div>
        {status && <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{status}</span>}
      </div>

      <div className="divide-y divide-slate-200 px-5 sm:px-6">
        {policyRows.map((row) => {
          const checked = policies[row.key];
          const busy = saving === row.key;
          return (
            <div key={row.key} className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-extrabold text-slate-900">{row.title}</div>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${checked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {checked ? 'Yes · On' : 'No · Off'}
                  </span>
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{row.note}</div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={`${row.title}: ${checked ? 'Yes' : 'No'}`}
                disabled={busy}
                onClick={() => toggle(row.key, !checked)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
