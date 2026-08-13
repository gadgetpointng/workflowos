'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import SmartSidebar from '@/components/SmartSidebar';
import NotificationSoundController from '@/components/NotificationSoundController';
import { normalizeWorkflowOSPermissions, scopeForNavigationHref } from '@/lib/workflow-access';

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
  profile?: {
    full_name?: string | null;
    role?: string | null;
    workflowos_identity_source?: string | null;
    workflowos_access_enabled?: boolean | null;
    workflowos_permissions?: string[] | null;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const gadgetPointStaff = profile?.workflowos_identity_source === 'gadgetpoint-staff-authorization-code';
  const workflowPermissions = useMemo(() => normalizeWorkflowOSPermissions(profile?.workflowos_permissions), [profile?.workflowos_permissions]);
  const canOpen = (href: string) => {
    if (!gadgetPointStaff) return true;
    if (profile?.workflowos_access_enabled !== true) return false;
    const required = scopeForNavigationHref(href);
    if (required === null) return true;
    if (required === 'owner') return false;
    return workflowPermissions.includes(required);
  };
  const visibleNavGroups = useMemo(() => navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canOpen(item.href)) }))
    .filter((group) => group.items.length > 0), [gadgetPointStaff, profile?.workflowos_access_enabled, workflowPermissions]);
  const visibleMobileNav = useMemo(() => mobileNav.filter((item) => canOpen(item.href)), [gadgetPointStaff, profile?.workflowos_access_enabled, workflowPermissions]);
  const allNavItems = visibleNavGroups.flatMap((group) => group.items);

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
    <div className="min-h-screen bg-[#f7f7f7] text-[#171717]" style={{ forcedColorAdjust: 'none', colorScheme: 'light' }}>
      <NotificationSoundController />

      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <SmartSidebar pathname={pathname} open={open} onClose={() => setOpen(false)} navGroups={visibleNavGroups} profile={profile} />

      <div className="min-h-screen lg:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-[#e5e5e5] bg-[#fbfbfb]/95 backdrop-blur-xl">
          <div className="flex min-h-[56px] items-center gap-3 px-4 sm:px-6 lg:px-7">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d4d4d4] bg-white text-sm font-semibold text-[#262626] lg:hidden"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]">
                <span>WorkflowOS</span>
                <span className="text-[#c2c2c2]">/</span>
                <span className="truncate font-medium text-[#404040]">{title || currentItem?.label || 'Workspace'}</span>
              </div>
              {subtitle && <div className="mt-0.5 truncate text-[10px] text-[#a3a3a3]">{subtitle}</div>}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#ccebdc] bg-[#f1fbf6] px-2.5 py-1.5 text-[10px] font-medium text-[#1f7a57]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e]" /> Live
              </span>
              {canOpen('/notifications') && <Link href="/notifications" prefetch={false} className="rounded-md border border-[#e1e1e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#525252] transition hover:bg-[#fafafa]">Alerts</Link>}
              {canOpen('/inbox') && <Link href="/inbox" prefetch={false} className="rounded-md border border-[#e1e1e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#525252] transition hover:bg-[#fafafa]">Inbox</Link>}
              {canOpen('/ai') && <Link href="/ai" prefetch={false} className="rounded-md border border-[#2d8a66] bg-[#2e8b67] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#267859]">AI</Link>}
            </div>
          </div>
        </header>

        <main className="w-full px-4 pb-32 pt-5 sm:px-6 lg:px-7 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <nav className={`mx-auto grid max-w-xl gap-1 rounded-xl border border-[#dedede] bg-white/96 p-1.5 shadow-[0_-6px_24px_rgba(0,0,0,.08)] backdrop-blur-xl ${visibleMobileNav.length >= 4 ? 'grid-cols-5' : visibleMobileNav.length === 3 ? 'grid-cols-4' : visibleMobileNav.length === 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {visibleMobileNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition ${active ? 'bg-[#f1fbf6]' : 'hover:bg-[#fafafa]'}`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-semibold ${active ? 'bg-[#2e8b67] text-white' : 'bg-[#f1f1f1] text-[#666]'}`}>{item.icon}</span>
                <span className={`max-w-full truncate text-[10px] font-medium leading-none ${active ? 'text-[#1f7a57]' : 'text-[#737373]'}`}>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open all WorkflowOS tools"
            className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition hover:bg-[#fafafa]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ededed] text-[13px] font-semibold text-[#404040]">☰</span>
            <span className="text-[10px] font-medium leading-none text-[#737373]">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
