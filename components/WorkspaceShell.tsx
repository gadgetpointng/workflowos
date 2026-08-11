'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '⌂' },
      { label: 'Today', href: '/today', icon: '☀' },
      { label: 'My Work', href: '/my-work', icon: '▣' },
      { label: 'Inbox', href: '/inbox', icon: '◉' },
      { label: 'Tasks', href: '/tasks', icon: '✓' },
      { label: 'Approvals', href: '/approvals', icon: '◫' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { label: 'Time', href: '/time', icon: '◷' },
      { label: 'Workload', href: '/workload', icon: '▤' },
      { label: 'Availability', href: '/availability', icon: '◴' },
      { label: 'Schedule', href: '/schedule', icon: '▦' },
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
      { label: 'Quotes', href: '/quotes', icon: '▤' },
      { label: 'Campaigns', href: '/campaigns', icon: '◈' },
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
    label: 'Automation & Intelligence',
    items: [
      { label: 'Automations', href: '/automations', icon: '⚡' },
      { label: 'Analytics', href: '/analytics', icon: '▥' },
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
      {
        label: 'Integration Commands',
        href: '/integration-commands',
        icon: '⇢',
      },
      { label: 'Team', href: '/team', icon: '♟' },
      { label: 'Activity', href: '/activity', icon: '◌' },
      { label: 'Settings', href: '/settings', icon: '⚙' },
      {
        label: 'Launch Readiness',
        href: '/launch-readiness',
        icon: '✓',
      },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

const iconStyles = [
  'bg-violet-500/20 text-violet-200',
  'bg-cyan-500/20 text-cyan-200',
  'bg-emerald-500/20 text-emerald-200',
  'bg-amber-500/20 text-amber-200',
  'bg-pink-500/20 text-pink-200',
];

const mobileNav = [
  { label: 'Home', href: '/dashboard', icon: '⌂' },
  { label: 'Today', href: '/today', icon: '☀' },
  { label: 'Tasks', href: '/tasks', icon: '✓' },
  { label: 'Growth', href: '/opportunities', icon: '✦' },
  { label: 'Inbox', href: '/inbox', icon: '◉' },
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
  profile?: {
    full_name?: string | null;
    role?: string | null;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const activeHref =
    allNavItems
      .filter(
        (item) =>
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`)
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? '';

  const displayName = profile?.full_name || 'WorkflowOS user';
  const role = profile?.role || 'member';

  const initials = displayName
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.10),_transparent_25%),linear-gradient(to_bottom,_#f8fafc,_#f1f5f9)] text-slate-900">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#111827_0%,#172554_45%,#312e81_100%)] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-violet-950/30">
              W
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold tracking-tight">
                  WorkflowOS
                </div>

                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-200">
                  Live
                </span>
              </div>

              <div className="mt-0.5 text-xs text-slate-300">
                Growth execution workspace
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {navGroups.map((group, groupIndex) => (
              <div key={group.label}>
                <div className="mb-2 flex items-center gap-2 px-3">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      groupIndex % 3 === 0
                        ? 'bg-violet-400'
                        : groupIndex % 3 === 1
                          ? 'bg-cyan-400'
                          : 'bg-emerald-400'
                    }`}
                  />

                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </span>
                </div>

                <div className="space-y-1">
                  {group.items.map((item, itemIndex) => {
                    const active = activeHref === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                          active
                            ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/20'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-transform group-hover:scale-105 ${
                            active
                              ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'
                              : iconStyles[
                                  (groupIndex + itemIndex) %
                                    iconStyles.length
                                ]
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span className="truncate font-medium">
                          {item.label}
                        </span>

                        {active && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-black text-slate-950">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {displayName}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] capitalize text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {role}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[292px]">
        <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm transition hover:bg-slate-50 lg:hidden"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                  {title || 'WorkflowOS'}
                </h1>

                <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:inline-flex">
                  Online
                </span>
              </div>

              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/inbox"
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-violet-500">◉</span>
                Inbox
              </Link>

              <Link
                href="/ai"
                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5"
              >
                <span>✧</span>
                Copilot
              </Link>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          <div className="relative">
            <div className="pointer-events-none absolute -left-16 top-10 -z-10 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-40 -z-10 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

            {children}
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-3xl border border-white/70 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
        {mobileNav.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition ${
                active
                  ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
