'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

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

const accentStyles = [
  'bg-cyan-400/15 text-cyan-200 ring-cyan-300/15',
  'bg-violet-400/15 text-violet-200 ring-violet-300/15',
  'bg-emerald-400/15 text-emerald-200 ring-emerald-300/15',
  'bg-amber-400/15 text-amber-100 ring-amber-300/15',
  'bg-pink-400/15 text-pink-200 ring-pink-300/15',
  'bg-blue-400/15 text-blue-200 ring-blue-300/15',
];

const groupDots = [
  'bg-cyan-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-blue-400',
];

const mobileNav = [
  { label: 'Home', href: '/dashboard', icon: '⌂' },
  { label: 'Today', href: '/today', icon: '☀' },
  { label: 'Tasks', href: '/tasks', icon: '✓' },
  { label: 'Growth', href: '/opportunities', icon: '✦' },
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

  const displayName = profile?.full_name || 'WorkflowOS user';
  const role = profile?.role || 'member';
  const initials = displayName
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const currentItem = allNavItems.find((item) => item.href === activeHref);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.11),transparent_24%),radial-gradient(circle_at_92%_4%,rgba(168,85,247,.12),transparent_25%),radial-gradient(circle_at_65%_100%,rgba(244,63,94,.07),transparent_25%),#f7f9fc] text-slate-950">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col overflow-hidden border-r border-white/10 bg-[#07111f] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-violet-500 via-pink-500 to-orange-400" />

        <div className="border-b border-white/8 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 text-sm font-black shadow-lg shadow-violet-950/40">
              WO
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">WorkflowOS Operations</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-400">Connected workspace</div>
            </div>
            <span className="text-xs text-slate-500">⌄</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {navGroups.map((group, groupIndex) => (
              <div key={group.label}>
                <div className="mb-2 flex items-center gap-2 px-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${groupDots[groupIndex % groupDots.length]}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {group.label}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item, itemIndex) => {
                    const active = activeHref === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all ${
                          active
                            ? 'bg-white text-slate-950 shadow-md'
                            : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ${
                            active
                              ? 'bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 text-white ring-transparent'
                              : accentStyles[(groupIndex + itemIndex) % accentStyles.length]
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate font-semibold">{item.label}</span>
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/8 p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-xs font-black text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{displayName}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] capitalize text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {role}
              </div>
            </div>
            <span className="text-slate-500">•••</span>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-slate-500">
            <span>Powered by</span>
            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
              GadgetPoint
            </span>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[286px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[64px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-base shadow-sm lg:hidden"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span>WorkflowOS</span>
                <span>/</span>
                <span className="truncate text-slate-700">{currentItem?.label || title || 'Workspace'}</span>
              </div>
              {subtitle && <div className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</div>}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
              </span>
              <Link
                href="/inbox"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Inbox
              </Link>
              <Link
                href="/ai"
                className="rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5"
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

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#07111f]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
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
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-bold transition ${
                active ? `bg-gradient-to-br ${mobileColors[index]} text-white` : 'text-slate-400'
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
