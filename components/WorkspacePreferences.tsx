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
    <label className={`flex min-h-[86px] items-center gap-5 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5 ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-extrabold text-slate-950">{title}</div>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${checked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{checked ? 'On' : 'Off'}</span>
        </div>
        <div className="mt-1.5 text-xs leading-5 text-slate-500">{note}</div>
      </div>
      <span className="relative inline-flex shrink-0 items-center">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="h-[34px] w-[58px] rounded-full border border-slate-300 bg-slate-300 shadow-inner transition-all duration-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100 peer-disabled:bg-slate-200" />
        <span className="absolute left-[2px] h-[28px] w-[28px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,.25)] transition-transform duration-200 peer-checked:translate-x-[27px]" />
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
    commit(next);
    playWorkflowNotificationSound();
  }

  function enableImportantAlerts() {
    commit({
      ...prefs,
      notificationsEnabled: true,
      soundAlerts: true,
      messageAlerts: true,
      overdueAlerts: true,
      approvalAlerts: true,
      followupAlerts: true,
      integrationAlerts: true,
      quietMode: false,
    });
  }

  function muteDelivery() {
    commit({ ...prefs, notificationsEnabled: true, soundAlerts: false, desktopNotifications: false, quietMode: true });
  }

  function resetPreferences() {
    commit(defaults);
    try {
      localStorage.removeItem('workflowos.sidebar.pins');
      localStorage.removeItem('workflowos.sidebar.recent');
    } catch {}
  }

  const notificationsOff = !prefs.notificationsEnabled;

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="px-1">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Workspace</div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Navigation & display</h2>
          <p className="mt-1 text-sm text-slate-500">Choose how WorkflowOS organizes your everyday workspace.</p>
        </div>
        <div className="mt-4 grid gap-3">
          <ToggleRow title="Smart sidebar" note="Prioritize Focus Now, pinned tools and the current work area." checked={prefs.smartSidebar} onChange={(checked) => commit({ ...prefs, smartSidebar: checked })} />
          <ToggleRow title="Recent tools" note="Keep recently used destinations close for faster navigation." checked={prefs.showRecent} onChange={(checked) => commit({ ...prefs, showRecent: checked })} />
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 px-1">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Notifications</div>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Notification settings</h2>
            <p className="mt-1 text-sm text-slate-500">Spacious iPhone-style controls for how alerts reach you.</p>
          </div>
          {saved && <span className="rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">Saved ✓</span>}
        </div>

        <div className="mt-4 grid gap-3">
          <ToggleRow title="Allow notifications" note="Master switch for WorkflowOS alerts. Off stops sounds and desktop popups while keeping your data available." checked={prefs.notificationsEnabled} onChange={(checked) => commit({ ...prefs, notificationsEnabled: checked })} />
        </div>

        <div className="mb-2 mt-7 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Delivery</div>
        <div className="grid gap-3">
          <ToggleRow title="Sound" note="Play the WorkflowOS chime for a new urgent alert while the app is active." checked={prefs.soundAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, soundAlerts: checked })} />
          <ToggleRow title="Desktop popups" note={permission === 'granted' ? 'Show important WorkflowOS alerts when this browser is in the background.' : permission === 'denied' ? 'Blocked by this browser. Re-enable notifications in your browser site permissions first.' : permission === 'unsupported' ? 'Desktop notifications are not supported by this browser.' : 'Allow this browser to show important WorkflowOS alerts.'} checked={prefs.desktopNotifications && permission === 'granted'} disabled={notificationsOff || permission === 'denied' || permission === 'unsupported'} onChange={(checked) => { if (checked && permission !== 'granted') void enableDesktop(); else commit({ ...prefs, desktopNotifications: checked }); }} />
          <ToggleRow title="Quiet mode" note="Keep alerts inside WorkflowOS but mute sound and desktop popups." checked={prefs.quietMode} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, quietMode: checked })} />
        </div>

        <div className="mb-2 mt-7 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">What can notify you</div>
        <div className="grid gap-3">
          <ToggleRow title="Owner messages" note="Feed announcements and private messages sent by the owner." checked={prefs.messageAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, messageAlerts: checked })} />
          <ToggleRow title="Urgent & overdue work" note="High-priority tasks that have passed their deadline." checked={prefs.overdueAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, overdueAlerts: checked })} />
          <ToggleRow title="Approvals" note="Decisions and requests waiting for management attention." checked={prefs.approvalAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, approvalAlerts: checked })} />
          <ToggleRow title="Customer follow-ups" note="Lead follow-ups that are overdue and need attention." checked={prefs.followupAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, followupAlerts: checked })} />
          <ToggleRow title="GadgetPoint connection" note="Alert when the GadgetPoint bridge is disconnected or needs attention." checked={prefs.integrationAlerts} disabled={notificationsOff} onChange={(checked) => commit({ ...prefs, integrationAlerts: checked })} />
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={enableImportantAlerts} className="ios-action rounded-[14px] bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-sm">Enable important alerts</button>
          <button type="button" onClick={muteDelivery} className="ios-action rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm">Mute delivery</button>
          <button type="button" onClick={testSound} className="ios-action rounded-[14px] border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black text-blue-800 shadow-sm">Test sound</button>
        </div>
      </section>

      <section className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Reset</div>
            <h2 className="mt-1 text-lg font-extrabold text-slate-950">Restore app preferences</h2>
            <p className="mt-1 text-sm text-slate-600">Reset notification choices, smart navigation, pins and recent tools on this browser. This does not delete account or business data.</p>
          </div>
          <button type="button" onClick={resetPreferences} className="ios-action rounded-[14px] border border-amber-200 bg-white px-4 py-3 text-xs font-black text-amber-800 shadow-sm">Reset preferences</button>
        </div>
      </section>
    </div>
  );
}
