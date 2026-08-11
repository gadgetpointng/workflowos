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
    label: 'Growth & Sales',
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
    label: 'Administration',
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
  { label: 'Opportunities', href: '/opportunities', icon: '✦' },
  { label: 'Tasks', href: '/tasks', icon: '✓' },
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
    <div className="min-h-screen bg-[#f4f6f8] text-[#172b3a]" style={{ forcedColorAdjust: 'none', colorScheme: 'light' }}>
      <NotificationSoundController />

      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[#081a2b]/45 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <SmartSidebar pathname={pathname} open={open} onClose={() => setOpen(false)} navGroups={navGroups} profile={profile} />

      <div className="min-h-screen lg:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-[#dfe5eb] bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-[64px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#ccd5de] bg-white text-sm font-bold text-[#102a43] shadow-sm lg:hidden"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b8996]">
                <span>WorkflowOS</span>
                <span className="text-[#bdc7d0]">/</span>
                <span className="truncate font-bold normal-case tracking-normal text-[#263b4c]">{title || currentItem?.label || 'Workspace'}</span>
              </div>
              {subtitle && <div className="mt-0.5 truncate text-[11px] font-medium text-[#738291]">{subtitle}</div>}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c5e2d3] bg-[#edf7f2] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#157347]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#157347]" /> Online
              </span>
              <Link href="/notifications" prefetch className="rounded-lg border border-[#d7e0e8] bg-white px-3 py-2 text-xs font-semibold text-[#405567] transition hover:bg-[#f7f9fb]">Alerts</Link>
              <Link href="/inbox" prefetch className="rounded-lg border border-[#d7e0e8] bg-white px-3 py-2 text-xs font-semibold text-[#405567] transition hover:bg-[#f7f9fb]">Inbox</Link>
              <Link href="/ai" prefetch className="rounded-lg border border-[#102a43] bg-[#102a43] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#173a5e]">Copilot</Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1580px] px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <nav className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-[18px] border border-[#d7e0e8] bg-white/96 p-1.5 shadow-[0_-8px_28px_rgba(8,26,43,.10)] backdrop-blur-xl">
          {mobileNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? 'page' : undefined}
                className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition ${active ? 'bg-[#edf3f8]' : 'hover:bg-[#f6f8fa]'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-bold transition ${active ? 'bg-[#102a43] text-white' : 'bg-[#eef2f5] text-[#53697c] group-hover:bg-[#e5ebf0]'}`}>{item.icon}</span>
                <span className={`max-w-full truncate text-[10px] font-bold leading-none ${active ? 'text-[#102a43]' : 'text-[#697988]'}`}>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open all WorkflowOS tools"
            className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition hover:bg-[#f6f8fa]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dfe6ec] text-[14px] font-bold text-[#102a43]">☰</span>
            <span className="text-[10px] font-bold leading-none text-[#697988]">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
