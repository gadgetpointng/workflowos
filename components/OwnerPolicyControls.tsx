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
    note: 'Allow the owner to broadcast one message to every active staff member.',
  },
  {
    key: 'privateMessages',
    title: 'Private staff messages',
    note: 'Allow direct one-to-one messages from the owner to a selected staff member.',
  },
  {
    key: 'readReceipts',
    title: 'Message read receipts',
    note: 'Show which staff have read an owner message and who is still pending.',
  },
  {
    key: 'messageRetraction',
    title: 'Message retraction',
    note: 'Allow the owner to retract a previously sent notification when needed.',
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
      setStatus(`${enabled ? 'On' : 'Off'} saved`);
    } catch (error) {
      setPolicies((current) => ({ ...current, [key]: previous }));
      setStatus(error instanceof Error ? error.message : 'Could not save control');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 pb-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Owner controls</div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Yes / No business options</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Each option has its own space, like iPhone Settings. Green is On / Yes. Grey is Off / No.</p>
        </div>
        {status && <span className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm">{status}</span>}
      </div>

      <div className="grid gap-3">
        {policyRows.map((row) => {
          const checked = policies[row.key];
          const busy = saving === row.key;
          return (
            <div key={row.key} className="flex min-h-[92px] items-center gap-5 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="text-[15px] font-extrabold text-slate-950">{row.title}</div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${checked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {checked ? 'Yes · On' : 'No · Off'}
                  </span>
                </div>
                <div className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">{row.note}</div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={`${row.title}: ${checked ? 'Yes' : 'No'}`}
                disabled={busy}
                onClick={() => toggle(row.key, !checked)}
                className={`ios-switch relative h-[34px] w-[58px] shrink-0 rounded-full border transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60 ${checked ? 'border-emerald-500 bg-emerald-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]' : 'border-slate-300 bg-slate-300 shadow-inner'}`}
              >
                <span className={`absolute top-[2px] h-[28px] w-[28px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,.25)] transition-transform duration-200 ${checked ? 'translate-x-[27px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
