'use client';

import { useEffect, useRef } from 'react';

type Preferences = {
  notificationsEnabled?: boolean;
  desktopNotifications?: boolean;
  soundAlerts?: boolean;
  quietMode?: boolean;
  messageAlerts?: boolean;
  buyerAlerts?: boolean;
  assignmentAlerts?: boolean;
  automationAlerts?: boolean;
  overdueAlerts?: boolean;
  approvalAlerts?: boolean;
  followupAlerts?: boolean;
  integrationAlerts?: boolean;
};

type Summary = {
  urgentCount?: number;
  urgentIds?: string[];
};

function readPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem('workflowos.preferences') || '{}');
    return typeof value === 'object' && value ? value : {};
  } catch {
    return {};
  }
}

function isEnabledAlert(id: string, preferences: Preferences) {
  if (preferences.notificationsEnabled === false) return false;
  if (id.startsWith('message:')) return preferences.messageAlerts !== false;
  if (id.startsWith('buyer:')) return preferences.buyerAlerts !== false;
  if (id.startsWith('assignment:')) return preferences.assignmentAlerts !== false;
  if (id.startsWith('automation:')) return preferences.automationAlerts !== false;
  if (id.startsWith('task:')) return preferences.overdueAlerts !== false;
  if (id.startsWith('approval:')) return preferences.approvalAlerts !== false;
  if (id.startsWith('followup:')) return preferences.followupAlerts !== false;
  if (id.startsWith('integration:')) return preferences.integrationAlerts !== false;
  return true;
}

function createChime(context: AudioContext) {
  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  const first = context.createOscillator();
  first.type = 'sine';
  first.frequency.setValueAtTime(659.25, now);
  first.connect(gain);
  first.start(now);
  first.stop(now + 0.22);

  const second = context.createOscillator();
  second.type = 'sine';
  second.frequency.setValueAtTime(880, now + 0.18);
  second.connect(gain);
  second.start(now + 0.18);
  second.stop(now + 0.52);
}

export function playWorkflowNotificationSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  void context
    .resume()
    .then(() => {
      createChime(context);
      window.setTimeout(() => void context.close(), 800);
    })
    .catch(() => {
      void context.close();
    });
}

function showDesktopNotification(newCount: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  const notification = new Notification('WorkflowOS needs your attention', {
    body: `${newCount} new ${newCount === 1 ? 'alert' : 'alerts'} waiting.`,
    tag: 'workflowos-urgent',
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = '/notifications';
    notification.close();
  };
}

export default function NotificationSoundController() {
  const baselineRef = useRef<Set<string> | null>(null);
  const armedRef = useRef(false);

  useEffect(() => {
    const arm = () => {
      armedRef.current = true;
    };

    window.addEventListener('pointerdown', arm, { passive: true });
    window.addEventListener('keydown', arm);

    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch('/api/notifications/summary', { cache: 'no-store' });
        if (!response.ok || cancelled) return;
        const summary = (await response.json()) as Summary;
        const preferences = readPreferences();
        const current = new Set((summary.urgentIds ?? []).filter((id) => isEnabledAlert(id, preferences)));

        if (baselineRef.current === null) {
          baselineRef.current = current;
          return;
        }

        const newIds = Array.from(current).filter((id) => !baselineRef.current?.has(id));
        baselineRef.current = current;

        if (!newIds.length || preferences.notificationsEnabled === false || preferences.quietMode === true) return;

        if (preferences.soundAlerts !== false && armedRef.current) {
          playWorkflowNotificationSound();
        }

        if (preferences.desktopNotifications === true) {
          showDesktopNotification(newIds.length);
        }
      } catch {}
    }

    void check();
    const interval = window.setInterval(check, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
