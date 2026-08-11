'use client';

import { useEffect, useState } from 'react';
import { playWorkflowNotificationSound } from '@/components/NotificationSoundController';

type Prefs = {
  soundAlerts?: boolean;
  quietMode?: boolean;
};

export default function NotificationSoundControls() {
  const [soundOn, setSoundOn] = useState(true);
  const [quietMode, setQuietMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('workflowos.preferences') || '{}') as Prefs;
      setSoundOn(prefs.soundAlerts !== false);
      setQuietMode(prefs.quietMode === true);
    } catch {}
    setReady(true);
  }, []);

  function save(nextSoundOn: boolean, nextQuietMode = quietMode) {
    setSoundOn(nextSoundOn);
    setQuietMode(nextQuietMode);
    try {
      const current = JSON.parse(localStorage.getItem('workflowos.preferences') || '{}');
      const next = { ...current, soundAlerts: nextSoundOn, quietMode: nextQuietMode };
      localStorage.setItem('workflowos.preferences', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('workflowos:preferences', { detail: next }));
    } catch {}
  }

  function test() {
    if (!soundOn || quietMode) save(true, false);
    playWorkflowNotificationSound();
  }

  if (!ready) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => save(!soundOn)}
        className={`rounded-xl px-3 py-2 text-xs font-black shadow-sm transition ${
          soundOn && !quietMode
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {soundOn && !quietMode ? '🔔 Sound on' : '🔕 Sound off'}
      </button>
      <button
        type="button"
        onClick={test}
        className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 transition hover:bg-violet-100"
      >
        Test chime
      </button>
    </div>
  );
}
