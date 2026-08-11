'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import SmartSidebar from '@/components/SmartSidebar';
import NotificationSoundController from '@/components/NotificationSoundController';

type NavItem = { label: string; href: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', href: '/dashboard', icon: '⌂' },
      { label: 'Today', href: '/today', icon: '☀' },
      { label: 'My Work', href: '/my-work', icon: '▤' },
      { label: 'Tasks', href: '/tasks', icon: '✓' },
      { label: 'Inbox', href: '/inbox', icon: '◎' },
      { label: 'Notifications', href: '/notifications', icon: '♢' },
      { label: 'Approvals', href: '/approvals', icon: '◇' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Schedule', href: '/schedule', icon: '▦' },
      { label: 'Time', href: '/time', icon: '◷' },
      { label: 'Workload', href: '/workload', icon: '▤' },
      { label: 'Availability', href: '/availability', icon: '◴' },
      { label: 'Recurring Work', href: '/recurring-work', icon: '↻' },
      { label: 'SLA', href: '/sla', icon: '⏱' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Opportunities', href: '/opportunities', icon: '✦' },
      { label: 'Buyer Intelligence', href: '/buyers', icon: '⌕' },
      { label: 'Buyer Radar', href: '/buyers/radar', icon: '◉' },
      { label: 'Leads', href: '/leads', icon: '◎' },
      { label: 'Customers', href: '/customers', icon: '◉' },
      { label: 'Sales', href: '/sales', icon: '₦' },
      { label: 'Quotes', href: '/quotes', icon: '▱' },
      { label: 'Campaigns', href: '/campaigns', icon: '☆' },
      { label: 'Goals', href: '/goals', icon: '◎' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Sites', href: '/sites', icon: '◐' },
      { label: 'Catalog', href: '/catalog', icon: '▦' },
      { label: 'Vendors', href: '/vendors', icon: '♢' },
      { label: 'Settlements', href: '/settlements', icon: '₦' },
      { label: 'Marketplaces', href: '/marketplaces', icon: '◇' },
      { label: 'Marketplace Jobs', href: '/marketplace-jobs', icon: '⇄' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Automations', href: '/automations', icon: '⚡' },
      { label: 'Analytics', href: '/analytics', icon: '⌁' },
      { label: 'Performance', href: '/performance', icon: '▲' },
      { label: 'Reports', href: '/reports', icon: '▧' },
      { label: 'AI Proposals', href: '/ai-proposals', icon: '✦' },
      { label: 'AI Assistant', href: '/ai', icon: '✧' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', href: '/integrations', icon: '↗' },
      { label: 'Integration Commands', href: '/integration-commands', icon: '⇢' },
      { label: 'Team', href: '/team', icon: '♙' },
      { label: 'Activity', href: '/activity', icon: '◌' },
      { label: 'Settings', href: '/settings', icon: '⚙' },
      { label: 'Launch Readiness', href: '/launch-readiness', icon: '✓' },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

const mobileNav = [
  { label: 'Home', href: '/dashboard', icon: '⌂' },
  { label: 'Today', href: '/today', icon: '☀' },
  { label: 'Tasks', href: '/tasks', icon: '✓' },
  { label: 'Alerts', href: '/notifications', icon: '♢' },
  { label: 'Inbox', href: '/inbox', icon: '◎' },
];

export default function WorkspaceShell({
  children,
  title,
  subtitle,
  profile,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  profile?: { full_name?: string | null; role?: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const activeHref =
    allNavItems
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? '';
  const currentItem = allNavItems.find((item) => item.href === activeHref);

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_5%_0%,rgba(14,165,233,.18),transparent_30%),radial-gradient(circle_at_95%_3%,rgba(124,58,237,.16),transparent_30%),radial-gradient(circle_at_70%_100%,rgba(236,72,153,.10),transparent_28%),#edf4ff] text-slate-950"
      style={{ forcedColorAdjust: 'none', colorScheme: 'light' }}
    >
      <NotificationSoundController />

      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <SmartSidebar
        pathname={pathname}
        open={open}
        onClose={() => setOpen(false)}
        navGroups={navGroups}
        profile={profile}
      />

      <div className="min-h-screen lg:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-blue-100/90 bg-[#f8fbff]/95 shadow-sm shadow-blue-950/5 backdrop-blur-xl">
          <div className="flex min-h-[64px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-white text-base text-slate-900 shadow-sm lg:hidden"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span>WorkflowOS</span>
                <span>/</span>
                <span className="truncate font-bold text-slate-900">{title || currentItem?.label || 'Workspace'}</span>
              </div>
              {subtitle && <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{subtitle}</div>}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
              </span>
              <Link
                href="/notifications"
                prefetch
                className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 shadow-sm transition hover:bg-violet-100"
              >
                ♢ Alerts
              </Link>
              <Link
                href="/inbox"
                prefetch
                className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-blue-50"
              >
                Inbox
              </Link>
              <Link
                href="/ai"
                prefetch
                className="rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5"
              >
                ✧ Copilot
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1580px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-cyan-300/20 bg-[#0b1738]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        {mobileNav.map((item, index) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const mobileColors = [
            'from-cyan-400 to-blue-500',
            'from-amber-400 to-orange-500',
            'from-emerald-400 to-teal-500',
            'from-violet-500 to-fuchsia-500',
            'from-pink-500 to-rose-500',
          ];
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-bold transition ${
                active ? `bg-gradient-to-br ${mobileColors[index]} text-white` : 'text-slate-200'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
