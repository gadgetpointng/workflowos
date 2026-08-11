'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type SmartFunctionKeysProps = {
  role?: string | null;
  overdueTasks?: number;
  pendingApprovals?: number;
  openLeads?: number;
  bridgeStatus?: string;
};

type SmartAction = {
  label: string;
  short: string;
  href: string;
  icon: string;
  score: number;
  reason: string;
  badge?: number | string;
  tone: string;
  ownerOnly?: boolean;
};

export default function SmartFunctionKeys({
  role,
  overdueTasks = 0,
  pendingApprovals = 0,
  openLeads = 0,
  bridgeStatus = 'Connected',
}: SmartFunctionKeysProps) {
  const router = useRouter();
  const normalizedRole = String(role || 'member').toLowerCase();
  const canManage = ['owner', 'admin', 'manager'].includes(normalizedRole);
  const bridgeHealthy = bridgeStatus.toLowerCase() === 'connected';

  const actions = useMemo(() => {
    const candidates: SmartAction[] = [
      {
        label: 'Rescue overdue work',
        short: 'Tasks',
        href: '/tasks',
        icon: '✓',
        score: overdueTasks > 0 ? 120 + overdueTasks : 38,
        reason: overdueTasks > 0 ? `${overdueTasks} overdue task${overdueTasks === 1 ? '' : 's'} need action` : 'Assign and track execution',
        badge: overdueTasks || undefined,
        tone: 'from-rose-500 to-orange-500',
      },
      {
        label: 'Close open revenue',
        short: 'Revenue',
        href: '/revenue-rescue',
        icon: '₦',
        score: openLeads > 0 ? 105 + Math.min(openLeads, 20) : 45,
        reason: openLeads > 0 ? `${openLeads} open lead${openLeads === 1 ? '' : 's'} in the pipeline` : 'Find sales worth following up',
        badge: openLeads || undefined,
        tone: 'from-emerald-500 to-teal-500',
      },
      {
        label: 'Clear approval queue',
        short: 'Approvals',
        href: '/approvals',
        icon: '◇',
        score: pendingApprovals > 0 ? 115 + pendingApprovals : 32,
        reason: pendingApprovals > 0 ? `${pendingApprovals} decision${pendingApprovals === 1 ? '' : 's'} waiting` : 'Review sensitive actions',
        badge: pendingApprovals || undefined,
        tone: 'from-orange-500 to-amber-500',
        ownerOnly: true,
      },
      {
        label: 'Protect follow-up SLA',
        short: 'Follow-ups',
        href: '/follow-up-sla',
        icon: '⏱',
        score: openLeads > 0 ? 92 : 42,
        reason: 'See customer follow-ups before they go cold',
        tone: 'from-fuchsia-500 to-violet-500',
      },
      {
        label: 'Run today',
        short: 'Today',
        href: '/today',
        icon: '☀',
        score: 80,
        reason: 'Your immediate operating queue',
        tone: 'from-cyan-500 to-blue-500',
      },
      {
        label: 'Compare branches',
        short: 'Branches',
        href: '/branch-radar',
        icon: '⌁',
        score: canManage ? 60 : 10,
        reason: 'See workload and pipeline by branch',
        tone: 'from-blue-500 to-indigo-500',
        ownerOnly: true,
      },
      {
        label: 'Check team pressure',
        short: 'Team',
        href: '/team/pulse',
        icon: '♙',
        score: canManage ? 58 : 12,
        reason: 'Spot overload, overdue work and submissions',
        tone: 'from-violet-500 to-fuchsia-500',
        ownerOnly: true,
      },
      {
        label: bridgeHealthy ? 'Check GadgetPoint bridge' : 'Fix GadgetPoint bridge',
        short: 'Bridge',
        href: '/integrations',
        icon: '↗',
        score: bridgeHealthy ? 24 : 200,
        reason: bridgeHealthy ? 'Integration health and events' : 'Connection needs attention now',
        badge: bridgeHealthy ? undefined : '!',
        tone: bridgeHealthy ? 'from-slate-500 to-slate-700' : 'from-rose-600 to-red-700',
        ownerOnly: true,
      },
      {
        label: 'Ask WorkflowOS Copilot',
        short: 'Copilot',
        href: '/ai',
        icon: '✧',
        score: 50,
        reason: 'Get help deciding the next move',
        tone: 'from-violet-600 via-fuchsia-500 to-cyan-500',
      },
    ];

    return candidates
      .filter((action) => !action.ownerOnly || canManage)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [bridgeHealthy, canManage, openLeads, overdueTasks, pendingApprovals]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= actions.length) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      router.push(actions[index].href);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, router]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600">Smart function keys</div>
          <h2 className="mt-1 text-lg font-black text-slate-950">Best next actions</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Priority changes automatically as the business changes.</p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
          Alt + 1–6
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            prefetch
            className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${action.tone}`} />
            <div className="flex items-start gap-3 pl-1">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.tone} text-sm font-black text-white shadow-sm`}>
                {action.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-black text-slate-900">{action.label}</span>
                  {action.badge !== undefined && (
                    <span className="shrink-0 rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black text-white">{action.badge}</span>
                  )}
                </div>
                <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">{action.reason}</div>
              </div>
              <kbd className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                {index + 1}
              </kbd>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
