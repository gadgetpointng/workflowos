'use client';

import { useEffect, useState } from 'react';

type Prefs = {
  smartSidebar: boolean;
  showRecent: boolean;
  desktopNotifications: boolean;
  overdueAlerts: boolean;
  approvalAlerts: boolean;
  followupAlerts: boolean;
  quietMode: boolean;
};

const defaults: Prefs = {
  smartSidebar: true,
  showRecent: true,
  desktopNotifications: false,
  overdueAlerts: true,
  approvalAlerts: true,
  followupAlerts: true,
  quietMode: false,
};

const rows: Array<{ key: keyof Prefs; title: string; note: string }> = [
  { key: 'smartSidebar', title: 'Smart sidebar', note: 'Prioritize Focus Now, pinned tools and the current work area.' },
  { key: 'showRecent', title: 'Recent tools', note: 'Keep recently used destinations close for faster navigation.' },
  { key: 'overdueAlerts', title: 'Overdue work alerts', note: 'Surface overdue tasks and execution risks.' },
  { key: 'approvalAlerts', title: 'Approval alerts', note: 'Notify when owner decisions are waiting.' },
  { key: 'followupAlerts', title: 'Customer follow-up alerts', note: 'Surface overdue and soon-due lead follow-ups.' },
  { key: 'quietMode', title: 'Quiet mode', note: 'Keep alerts inside WorkflowOS without attention-grabbing browser notifications.' },
];

export default function WorkspacePreferences() {
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('workflowos.preferences') || '{}');
      setPrefs({ ...defaults, ...stored });
    } catch {}
    if ('Notification' in window) setPermission(Notification.permission);
    else setPermission('unsupported');
  }, []);

  function commit(next: Prefs) {
    setPrefs(next);
    try {
      localStorage.setItem('workflowos.preferences', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('workflowos:preferences', { detail: next }));
    } catch {}
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  async function enableDesktop() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') commit({ ...prefs, desktopNotifications: true });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">Personal workspace</div>
            <h2 className="mt-1 text-lg font-black text-slate-950">How WorkflowOS should behave for you</h2>
            <p className="mt-1 text-sm text-slate-500">These preferences stay on this browser and apply immediately.</p>
          </div>
          {saved && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Saved ✓</span>}
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {rows.map((row) => (
            <label key={row.key} className="flex cursor-pointer items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{row.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{row.note}</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(prefs[row.key])}
                onChange={(event) => commit({ ...prefs, [row.key]: event.target.checked })}
                className="h-5 w-5 rounded border-slate-300 accent-violet-600"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Browser notifications</div>
            <h2 className="mt-1 text-lg font-black text-slate-950">Desktop alerts</h2>
            <p className="mt-1 text-sm text-slate-600">
              {permission === 'granted' ? 'Permission granted. WorkflowOS can show browser alerts when enabled.' : permission === 'denied' ? 'Notifications are blocked in this browser. Change the browser site permission to enable them.' : permission === 'unsupported' ? 'This browser does not support desktop notifications.' : 'Allow this browser to show important WorkflowOS alerts.'}
            </p>
          </div>
          {permission !== 'unsupported' && permission !== 'denied' && (
            <button
              type="button"
              onClick={permission === 'granted' ? () => commit({ ...prefs, desktopNotifications: !prefs.desktopNotifications }) : enableDesktop}
              className={`rounded-xl px-4 py-2.5 text-xs font-black shadow-sm transition ${prefs.desktopNotifications && permission === 'granted' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-950 text-white hover:bg-slate-800'}`}
            >
              {prefs.desktopNotifications && permission === 'granted' ? 'Desktop alerts on' : 'Enable desktop alerts'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
