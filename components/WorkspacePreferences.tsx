'use client';

import { useEffect, useState } from 'react';
import { playWorkflowNotificationSound } from '@/components/NotificationSoundController';

type Prefs = {
  smartSidebar: boolean;
  showRecent: boolean;
  notificationsEnabled: boolean;
  desktopNotifications: boolean;
  soundAlerts: boolean;
  messageAlerts: boolean;
  overdueAlerts: boolean;
  approvalAlerts: boolean;
  followupAlerts: boolean;
  integrationAlerts: boolean;
  quietMode: boolean;
};

const defaults: Prefs = {
  smartSidebar: true,
  showRecent: true,
  notificationsEnabled: true,
  desktopNotifications: false,
  soundAlerts: true,
  messageAlerts: true,
  overdueAlerts: true,
  approvalAlerts: true,
  followupAlerts: true,
  integrationAlerts: true,
  quietMode: false,
};

type ToggleRowProps = {
  title: string;
  note: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ title, note, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <label className={`flex items-center gap-4 py-4 first:pt-0 last:pb-0 ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
      </div>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-7 w-12 rounded-full bg-slate-200 shadow-inner transition peer-checked:bg-emerald-500 peer-disabled:bg-slate-100" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

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
    if (result === 'granted') commit({ ...prefs, notificationsEnabled: true, desktopNotifications: true });
  }

  function testSound() {
    const next = { ...prefs, notificationsEnabled: true, quietMode: false, soundAlerts: true };
    if (next !== prefs) commit(next);
    playWorkflowNotificationSound();
  }

  const notificationsOff = !prefs.notificationsEnabled;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">Workspace</div>
          <h2 className="mt-1 text-lg font-black text-slate-950">Navigation & display</h2>
          <p className="mt-1 text-sm text-slate-500">Choose how WorkflowOS organizes your everyday workspace.</p>
        </div>
        <div className="mt-5 divide-y divide-slate-100">
          <ToggleRow title="Smart sidebar" note="Prioritize Focus Now, pinned tools and the current work area." checked={prefs.smartSidebar} onChange={(checked) => commit({ ...prefs, smartSidebar: checked })} />
          <ToggleRow title="Recent tools" note="Keep recently used destinations close for faster navigation." checked={prefs.showRecent} onChange={(checked) => commit({ ...prefs, showRecent: checked })} />
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Notifications</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">Notification settings</h2>
              <p className="mt-1 text-sm text-slate-500">Control alerts the same way you would from phone settings.</p>
            </div>
            {saved && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Saved ✓</span>}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <ToggleRow
              title="Allow notifications"
              note="Master switch for WorkflowOS alerts. Turning this off keeps your data available but stops sounds and desktop popups."
              checked={prefs.notificationsEnabled}
              onChange={(checked) => commit({ ...prefs, notificationsEnabled: checked })}
            />
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Delivery</div>
          <div className="divide-y divide-slate-200">
            <ToggleRow title="Sound" note="Play the WorkflowOS chime for a new urgent alert while the app is active." checked={prefs.soundAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, soundAlerts: checked })} />
            <ToggleRow
              title="Desktop popups"
              note={permission === 'granted' ? 'Show important WorkflowOS alerts when this browser is in the background.' : permission === 'denied' ? 'Blocked by this browser. Re-enable notifications in your browser site permissions first.' : permission === 'unsupported' ? 'Desktop notifications are not supported by this browser.' : 'Allow this browser to show important WorkflowOS alerts.'}
              checked={prefs.desktopNotifications && permission === 'granted'}
              disabled={notificationsOff || permission === 'denied' || permission === 'unsupported'}
              onChange={(checked) => {
                if (checked && permission !== 'granted') void enableDesktop();
                else commit({ ...prefs, desktopNotifications: checked });
              }}
            />
            <ToggleRow title="Quiet mode" note="Keep alerts inside WorkflowOS but mute sound and desktop popups." checked={prefs.quietMode} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, quietMode: checked })} />
          </div>

          <div className="mb-2 mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">What can notify you</div>
          <div className="divide-y divide-slate-200">
            <ToggleRow title="Owner messages" note="Feed announcements and private messages sent by the owner." checked={prefs.messageAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, messageAlerts: checked })} />
            <ToggleRow title="Urgent & overdue work" note="High-priority tasks that have passed their deadline." checked={prefs.overdueAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, overdueAlerts: checked })} />
            <ToggleRow title="Approvals" note="Decisions and requests waiting for management attention." checked={prefs.approvalAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, approvalAlerts: checked })} />
            <ToggleRow title="Customer follow-ups" note="Lead follow-ups that are overdue and need attention." checked={prefs.followupAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, followupAlerts: checked })} />
            <ToggleRow title="GadgetPoint connection" note="Alert when the GadgetPoint bridge is disconnected or needs attention." checked={prefs.integrationAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, integrationAlerts: checked })} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <button type="button" onClick={testSound} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-violet-800 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-100">
              🔔 Test notification sound
            </button>
            <div className="text-xs font-semibold text-violet-700">Testing sound temporarily turns notifications and sound on and exits quiet mode.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
