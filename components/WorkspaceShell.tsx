'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { logout } from '@/app/login/actions';

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
  'bg-cyan-400/20 text-cyan-100 ring-cyan-300/25',
  'bg-violet-400/20 text-violet-100 ring-violet-300/25',
  'bg-emerald-400/20 text-emerald-100 ring-emerald-300/25',
  'bg-amber-400/20 text-amber-100 ring-amber-300/25',
  'bg-pink-400/20 text-pink-100 ring-pink-300/25',
  'bg-blue-400/20 text-blue-100 ring-blue-300/25',
];

const groupDots = [
  'bg-cyan-300',
  'bg-violet-300',
  'bg-emerald-300',
  'bg-orange-300',
  'bg-pink-300',
  'bg-blue-300',
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

  const role = profile?.role || 'member';
  const displayName = role === 'owner' ? 'GADGETPOINT' : profile?.full_name || 'WorkflowOS user';
  const initials = displayName
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const currentItem = allNavItems.find((item) => item.href === activeHref);

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_5%_0%,rgba(14,165,233,.18),transparent_30%),radial-gradient(circle_at_95%_3%,rgba(124,58,237,.16),transparent_30%),radial-gradient(circle_at_70%_100%,rgba(236,72,153,.10),transparent_28%),#edf4ff] text-slate-950"
      style={{ forcedColorAdjust: 'none', colorScheme: 'light' }}
    >
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col overflow-hidden border-r border-cyan-300/20 bg-[#0b1738] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-1.5 bg-gradient-to-r from-cyan-300 via-blue-500 via-violet-500 to-pink-400" />

        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-inner shadow-white/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-sm font-black text-white shadow-lg shadow-blue-950/40">
              WO
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-white">WorkflowOS Operations</div>
              <div className="mt-0.5 truncate text-[11px] font-semibold text-cyan-100/80">Connected workspace</div>
            </div>
            <span className="text-xs text-cyan-100/60">⌄</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {navGroups.map((group, groupIndex) => (
              <div key={group.label}>
                <div className="mb-2 flex items-center gap-2 px-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${groupDots[groupIndex % groupDots.length]}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
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
                            ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30 ring-1 ring-white/20'
                            : 'text-slate-100 hover:bg-white/[0.09] hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ${
                            active
                              ? 'bg-white/15 text-white ring-white/20'
                              : accentStyles[(groupIndex + itemIndex) % accentStyles.length]
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate font-semibold">{item.label}</span>
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow shadow-emerald-300/50" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-xs font-black text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{displayName}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold capitalize text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {role}
              </div>
            </div>
          </div>

          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-xs font-bold text-slate-100 transition hover:bg-white/15 hover:text-white"
            >
              <span aria-hidden="true">↪</span>
              Log out
            </button>
          </form>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-slate-300">
            <span>Powered by</span>
            <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent">
              GadgetPoint
            </span>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[286px]">
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
                <span className="truncate font-bold text-slate-900">{currentItem?.label || title || 'Workspace'}</span>
              </div>
              {subtitle && <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{subtitle}</div>}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
              </span>
              <Link
                href="/inbox"
                className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-blue-50"
              >
                Inbox
              </Link>
              <Link
                href="/ai"
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
