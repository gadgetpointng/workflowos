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

// Bright, high-contrast mobile dock for fast daily navigation.
const mobileNav = [
  { label: 'Home', href: '/dashboard', icon: '⌂', tone: 'from-cyan-500 to-blue-600' },
  { label: 'Opportunities', href: '/opportunities', icon: '✦', tone: 'from-violet-500 to-fuchsia-500' },
  { label: 'Tasks', href: '/tasks', icon: '✓', tone: 'from-emerald-500 to-teal-500' },
  { label: 'Inbox', href: '/inbox', icon: '◎', tone: 'from-pink-500 to-rose-500' },
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
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <SmartSidebar pathname={pathname} open={open} onClose={() => setOpen(false)} navGroups={navGroups} profile={profile} />

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
              <Link href="/notifications" prefetch className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 shadow-sm transition hover:bg-violet-100">♢ Alerts</Link>
              <Link href="/inbox" prefetch className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-blue-50">Inbox</Link>
              <Link href="/ai" prefetch className="rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">✧ Copilot</Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1580px] px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <nav className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-[26px] border border-white/90 bg-white/92 p-1.5 shadow-[0_-10px_40px_rgba(15,23,42,.12)] ring-1 ring-slate-200/70 backdrop-blur-2xl">
          {mobileNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? 'page' : undefined}
                className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200 ${active ? 'bg-slate-50 shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-50'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[15px] font-black transition-all ${active ? `bg-gradient-to-br ${item.tone} text-white shadow-md` : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'}`}>{item.icon}</span>
                <span className={`max-w-full truncate text-[10px] font-extrabold leading-none ${active ? 'text-slate-950' : 'text-slate-600'}`}>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open all WorkflowOS tools"
            className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-[15px] font-black text-white shadow-md">☰</span>
            <span className="text-[10px] font-extrabold leading-none text-slate-700">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
