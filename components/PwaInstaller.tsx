'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true;
}

export default function PwaInstaller() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    if (isStandalone()) return;

    const detectedIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const timer = window.setTimeout(() => {
      setIos(detectedIos);
      setVisible(true);
    }, 1200);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setGuideOpen(false);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) {
      setGuideOpen(true);
      return;
    }
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') setVisible(false);
    setPrompt(null);
  }

  if (!visible) return null;

  return <>
    <aside aria-label="Install WorkflowOS" className="fixed bottom-24 right-4 z-[100] flex w-[min(390px,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl md:bottom-5 md:right-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#08111f] text-sm font-black text-white">W</span>
      <div className="min-w-0 flex-1"><b className="block text-sm text-slate-900">Install WorkflowOS</b><small className="mt-0.5 block text-[11px] leading-4 text-slate-500">Open your workspace like an app on this device.</small></div>
      <button type="button" onClick={install} className="rounded-lg bg-[#2377ff] px-3 py-2 text-xs font-bold text-white">{prompt ? 'Install' : 'How'}</button>
      <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss install suggestion" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100">×</button>
    </aside>
    {guideOpen && <div className="fixed inset-0 z-[110] grid place-items-center p-5">
      <button type="button" aria-label="Close installation guide" onClick={() => setGuideOpen(false)} className="absolute inset-0 bg-slate-950/55" />
      <section role="dialog" aria-modal="true" aria-labelledby="workflowos-install-title" className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#08111f] text-lg font-black text-white">W</div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#2377ff]">WorkflowOS app</p>
        <h2 id="workflowos-install-title" className="text-xl font-bold text-slate-950">Add WorkflowOS to this device</h2>
        {ios ? <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600"><li>Open WorkflowOS in <b>Safari</b>.</li><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</li></ol> : <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600"><li>Open your browser menu.</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm to install WorkflowOS.</li></ol>}
        <p className="mt-4 text-xs leading-5 text-slate-500">The installed app uses the same secure WorkflowOS sign-in and permissions as the browser version.</p>
        <button type="button" onClick={() => setGuideOpen(false)} className="mt-5 w-full rounded-xl bg-[#08111f] px-4 py-3 text-sm font-bold text-white">Got it</button>
      </section>
    </div>}
  </>;
}
