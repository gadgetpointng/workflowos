'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { logout } from '@/app/login/actions';

type NavItem = { label: string; href: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

type SmartSidebarProps = {
  pathname: string;
  open: boolean;
  onClose: () => void;
  navGroups: NavGroup[];
  profile?: { full_name?: string | null; role?: string | null };
};

const ownerOnly = new Set([
  '/owner',
  '/owner-communications',
  '/approvals',
  '/team',
  '/activity',
  '/integrations',
  '/integration-commands',
  '/analytics',
  '/performance',
  '/reports',
  '/ai-proposals',
  '/settings',
  '/launch-readiness',
  '/branch-radar',
  '/team/pulse',
]);

const secondaryTools: NavItem[] = [
  { label: 'My Work', href: '/my-work', icon: '▤' },
  { label: 'Daily Briefing', href: '/briefing', icon: '☀' },
  { label: 'Revenue Rescue', href: '/revenue-rescue', icon: '₦' },
  { label: 'Follow-up SLA', href: '/follow-up-sla', icon: '⏱' },
  { label: 'Schedule', href: '/schedule', icon: '▦' },
  { label: 'Time', href: '/time', icon: '◷' },
  { label: 'Workload', href: '/workload', icon: '▤' },
  { label: 'Availability', href: '/availability', icon: '◴' },
  { label: 'Recurring Work', href: '/recurring-work', icon: '↻' },
  { label: 'SLA', href: '/sla', icon: '⏱' },
  { label: 'Buyer Intelligence', href: '/buyers', icon: '⌕' },
  { label: 'Customers', href: '/customers', icon: '◉' },
  { label: 'Quotes', href: '/quotes', icon: '▱' },
  { label: 'Goals', href: '/goals', icon: '◎' },
  { label: 'Sites', href: '/sites', icon: '◐' },
  { label: 'Catalog', href: '/catalog', icon: '▦' },
  { label: 'Vendors', href: '/vendors', icon: '♢' },
  { label: 'Settlements', href: '/settlements', icon: '₦' },
  { label: 'Marketplaces', href: '/marketplaces', icon: '◇' },
  { label: 'Marketplace Jobs', href: '/marketplace-jobs', icon: '⇄' },
  { label: 'Performance', href: '/performance', icon: '▲' },
  { label: 'Reports', href: '/reports', icon: '▧' },
  { label: 'AI Proposals', href: '/ai-proposals', icon: '✦' },
  { label: 'AI Assistant', href: '/ai', icon: '✧' },
  { label: 'Owner Communications', href: '/owner-communications', icon: '✦' },
  { label: 'Integration Commands', href: '/integration-commands', icon: '⇢' },
  { label: 'Launch Readiness', href: '/launch-readiness', icon: '✓' },
  { label: 'Branch Radar', href: '/branch-radar', icon: '⌁' },
  { label: 'Team Pulse', href: '/team/pulse', icon: '♙' },
];

function hrefMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SmartSidebar({ pathname, open, onClose, navGroups, profile }: SmartSidebarProps) {
  const role = String(profile?.role || 'member').toLowerCase();
  const isOwner = role === 'owner';
  const canManage = ['owner', 'admin', 'manager'].includes(role);
  const displayName = profile?.full_name || 'WorkflowOS user';
  const initials = displayName.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();

  const visibleGroups = useMemo(
    () => navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.href === '/owner') return isOwner;
          return canManage || !ownerOnly.has(item.href);
        }),
      }))
      .filter((group) => group.items.length > 0),
    [canManage, isOwner, navGroups]
  );

  const activeGroup = visibleGroups.find((group) => group.items.some((item) => hrefMatches(pathname, item.href)))?.label;
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>(activeGroup ? [activeGroup] : ['Workspace']);

  const searchableItems = useMemo(() => {
    const combined = [...visibleGroups.flatMap((group) => group.items), ...secondaryTools];
    return combined.filter((item, index, list) =>
      list.findIndex((candidate) => candidate.href === item.href) === index &&
      (canManage || !ownerOnly.has(item.href)) &&
      (!ownerOnly.has(item.href) || isOwner)
    );
  }, [canManage, isOwner, visibleGroups]);

  const searchResults = query.trim()
    ? searchableItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12)
    : [];

  function toggleGroup(label: string) {
    setExpanded((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label]
    );
  }

  function NavRow({ item }: { item: NavItem }) {
    const active = hrefMatches(pathname, item.href);
    return (
      <Link
        href={item.href}
        prefetch
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={`flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition ${active ? 'bg-[#214e78] text-white shadow-sm ring-1 ring-inset ring-white/10' : 'text-[#d6e0e8] hover:bg-white/[0.07] hover:text-white'}`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${active ? 'border-white/15 bg-white/10 text-white' : 'border-white/[0.08] bg-white/[0.04] text-[#b7c7d4]'}`}>{item.icon}</span>
        <span className="truncate font-semibold">{item.label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#79c79b]" />}
      </Link>
    );
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col overflow-hidden border-r border-[#294865] bg-[#102a43] text-white shadow-[8px_0_24px_rgba(8,26,43,.08)] transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-1 bg-[#3d739d]" />

      <div className="border-b border-white/[0.09] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white text-sm font-extrabold tracking-tight text-[#102a43] shadow-sm">WO</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold tracking-tight text-white">WorkflowOS</div>
            <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9db1c1]">{isOwner ? 'Owner workspace' : canManage ? 'Management workspace' : 'Staff workspace'}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-[#aabcc9] hover:bg-white/[0.08] hover:text-white lg:hidden">×</button>
        </div>

        <div className="relative mt-4">
          <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-[#8199ab]">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all tools"
            className="w-full rounded-lg border border-white/[0.11] bg-[#0b2238] py-2.5 pl-8 pr-3 text-xs font-medium text-white outline-none placeholder:text-[#71899b] focus:border-[#6f9abb] focus:bg-[#0d263e] focus:ring-2 focus:ring-[#6f9abb]/20"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {query.trim() ? (
          <div>
            <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8fa6b7]">Search results</div>
            <div className="space-y-1">
              {searchResults.map((item) => <NavRow key={item.href} item={item} />)}
              {!searchResults.length && <div className="rounded-lg border border-dashed border-white/[0.12] p-4 text-xs font-medium text-[#8fa6b7]">No matching tool.</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleGroups.map((group) => {
              const isOpen = expanded.includes(group.label);
              const hasActive = group.items.some((item) => hrefMatches(pathname, item.href));
              return (
                <section key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-[0.045em] transition ${hasActive ? 'bg-white/[0.07] text-white' : 'text-[#aabcc9] hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${hasActive ? 'bg-[#6fa1c8]' : 'bg-[#47667f]'}`} />
                    <span className="flex-1">{group.label}</span>
                    <span className={`text-[9px] text-[#6f8799] transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                  </button>
                  {isOpen && <div className="mt-1 space-y-1 pl-1">{group.items.map((item) => <NavRow key={item.href} item={item} />)}</div>}
                </section>
              );
            })}

            <div className="mt-5 border-t border-white/[0.09] pt-4 px-2 text-[10px] leading-4 text-[#7890a2]">
              Less-used pages are hidden from the menu. Use search when you need one.
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.09] p-3">
        <div className="flex items-center gap-3 rounded-lg border border-white/[0.09] bg-[#0d263e] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-[#294e6c] text-xs font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">{displayName}</div>
            <div className="mt-0.5 text-[10px] font-medium capitalize text-[#9db1c1]">{role}</div>
          </div>
          {isOwner && <Link href="/owner" onClick={onClose} className="rounded-md p-2 text-[#9fc0d8] transition hover:bg-white/[0.08] hover:text-white" title="Owner Control">◆</Link>}
          <Link href="/settings" onClick={onClose} className="rounded-md p-2 text-[#8fa6b7] transition hover:bg-white/[0.08] hover:text-white" title="Settings">⚙</Link>
        </div>
        <form action={logout} className="mt-2">
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#9db1c1] transition hover:bg-white/[0.06] hover:text-white">↪ Log out</button>
        </form>
      </div>
    </aside>
  );
}
