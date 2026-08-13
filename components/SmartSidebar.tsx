'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { logout } from '@/app/login/actions';

type NavItem = { label: string; href: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };
type SidebarPrefs = { smartSidebar?: boolean; showRecent?: boolean };

type SmartSidebarProps = {
  pathname: string;
  open: boolean;
  onClose: () => void;
  navGroups: NavGroup[];
  profile?: { full_name?: string | null; role?: string | null };
};

const ownerOnly = new Set([
  '/owner','/owner-communications','/approvals','/workload','/availability','/recurring-work','/analytics','/performance','/reports','/ai-proposals','/integrations','/integration-commands','/team','/activity','/settings','/launch-readiness','/branch-radar','/team/pulse',
]);

function hrefMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SmartSidebar({ pathname, open, onClose, navGroups, profile }: SmartSidebarProps) {
  const role = String(profile?.role || 'member').toLowerCase();
  const isOwner = role === 'owner';
  const canManage = ['owner', 'admin', 'manager'].includes(role);
  const displayName = profile?.full_name || 'WorkflowOS user';
  const initials = displayName.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();

  const visibleGroups = useMemo(() => navGroups.map((group) => ({ ...group, items: group.items.filter((item) => canManage || !ownerOnly.has(item.href)) })).filter((group) => group.items.length > 0), [canManage, navGroups]);
  const allItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const activeItem = allItems.find((item) => hrefMatches(pathname, item.href));
  const activeGroup = visibleGroups.find((group) => group.items.some((item) => hrefMatches(pathname, item.href)))?.label;

  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>(() => (activeGroup ? [activeGroup] : ['Workspace']));
  const [recent, setRecent] = useState<string[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<SidebarPrefs>({ smartSidebar: true, showRecent: true });

  useEffect(() => {
    function load() {
      try {
        const savedRecent = JSON.parse(localStorage.getItem('workflowos.sidebar.recent') || '[]');
        const savedPins = JSON.parse(localStorage.getItem('workflowos.sidebar.pins') || '[]');
        const savedPrefs = JSON.parse(localStorage.getItem('workflowos.preferences') || '{}');
        if (Array.isArray(savedRecent)) setRecent(savedRecent);
        if (Array.isArray(savedPins)) setPins(savedPins);
        setPrefs({ smartSidebar: true, showRecent: true, ...savedPrefs });
      } catch {}
    }
    load();
    const sync = () => load();
    window.addEventListener('workflowos:preferences', sync as EventListener);
    return () => window.removeEventListener('workflowos:preferences', sync as EventListener);
  }, []);

  useEffect(() => {
    if (!activeItem) return;
    setRecent((current) => {
      const next = [activeItem.href, ...current.filter((href) => href !== activeItem.href)].slice(0, 5);
      try { localStorage.setItem('workflowos.sidebar.recent', JSON.stringify(next)); } catch {}
      return next;
    });
    if (activeGroup) setExpanded((current) => (current.includes(activeGroup) ? current : [activeGroup]));
  }, [activeGroup, activeItem?.href]);

  const focusHrefs = isOwner
    ? ['/owner', '/owner-communications', '/notifications', '/briefing', '/revenue-rescue']
    : canManage
      ? ['/dashboard', '/notifications', '/briefing', '/revenue-rescue', '/approvals']
      : ['/today', '/notifications', '/my-work', '/tasks', '/follow-up-sla'];

  const specialItems: NavItem[] = [
    ...(isOwner
      ? [
          { label: 'Owner Control', href: '/owner', icon: '◆' },
          { label: 'Owner Communications', href: '/owner-communications', icon: '✦' },
        ]
      : []),
    { label: 'Notifications', href: '/notifications', icon: '●' },
    { label: 'Daily Briefing', href: '/briefing', icon: '☀' },
    { label: 'Revenue Rescue', href: '/revenue-rescue', icon: '₦' },
    { label: 'Team Pulse', href: '/team/pulse', icon: '♙' },
    { label: 'Branch Radar', href: '/branch-radar', icon: '⌁' },
    { label: 'Follow-up SLA', href: '/follow-up-sla', icon: '⏱' },
  ];

  const itemMap = new Map([...allItems, ...specialItems].map((item) => [item.href, item]));
  const focusItems = focusHrefs.map((href) => itemMap.get(href)).filter(Boolean) as NavItem[];
  const recentItems = recent.map((href) => itemMap.get(href)).filter(Boolean) as NavItem[];
  const pinnedItems = pins.map((href) => itemMap.get(href)).filter(Boolean) as NavItem[];
  const searchResults = query.trim() ? [...allItems, ...specialItems].filter((item, index, list) => list.findIndex((candidate) => candidate.href === item.href) === index).filter((item) => (canManage || !ownerOnly.has(item.href)) && (!ownerOnly.has(item.href) || isOwner) && item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 10) : [];

  function togglePin(href: string) {
    setPins((current) => {
      const next = current.includes(href) ? current.filter((item) => item !== href) : [href, ...current].slice(0, 6);
      try { localStorage.setItem('workflowos.sidebar.pins', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function toggleGroup(label: string) {
    setExpanded((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
  }

  function NavRow({ item, compact = false }: { item: NavItem; compact?: boolean }) {
    const active = hrefMatches(pathname, item.href);
    const pinned = pins.includes(item.href);
    return (
      <div className="group/row flex items-center gap-1">
        <Link
          href={item.href}
          prefetch={false}
          onClick={onClose}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition ${active ? 'bg-[#214e78] text-white shadow-sm ring-1 ring-inset ring-white/10' : 'text-[#d6e0e8] hover:bg-white/[0.07] hover:text-white'}`}
        >
          <span className={`flex ${compact ? 'h-6 w-6' : 'h-7 w-7'} shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${active ? 'border-white/15 bg-white/10 text-white' : 'border-white/[0.08] bg-white/[0.04] text-[#b7c7d4]'}`}>{item.icon}</span>
          <span className="truncate font-semibold">{item.label}</span>
          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#79c79b]" />}
        </Link>
        <button
          type="button"
          aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
          onClick={() => togglePin(item.href)}
          className={`h-8 w-8 shrink-0 rounded-md text-xs transition ${pinned ? 'text-[#e7c96d]' : 'text-[#7690a4] opacity-0 hover:bg-white/[0.07] hover:text-white group-hover/row:opacity-100'}`}
        >
          {pinned ? '★' : '☆'}
        </button>
      </div>
    );
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col overflow-hidden border-r border-[#294865] bg-[#102a43] text-white shadow-[8px_0_24px_rgba(8,26,43,.08)] transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
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
            placeholder="Search workspace"
            className="w-full rounded-lg border border-white/[0.11] bg-[#0b2238] py-2.5 pl-8 pr-3 text-xs font-medium text-white outline-none placeholder:text-[#71899b] focus:border-[#6f9abb] focus:bg-[#0d263e] focus:ring-2 focus:ring-[#6f9abb]/20"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {query.trim() ? (
          <div>
            <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8fa6b7]">Search results</div>
            <div className="space-y-0.5">
              {searchResults.map((item) => <NavRow key={item.href} item={item} />)}
              {!searchResults.length && <div className="rounded-lg border border-dashed border-white/[0.12] p-4 text-xs font-medium text-[#8fa6b7]">Nothing matches “{query}”.</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {prefs.smartSidebar !== false && (
              <section>
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8fa6b7]">Priority workspace</span>
                  <span className="rounded border border-white/[0.10] bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#b9c7d1]">Smart</span>
                </div>
                <div className="space-y-0.5">{focusItems.map((item) => <NavRow key={item.href} item={item} />)}</div>
              </section>
            )}

            {pinnedItems.length > 0 && (
              <section>
                <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b9a668]">Pinned</div>
                <div className="space-y-0.5">{pinnedItems.map((item) => <NavRow key={item.href} item={item} compact />)}</div>
              </section>
            )}

            {prefs.showRecent !== false && recentItems.length > 1 && (
              <section>
                <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#71899b]">Recent</div>
                <div className="space-y-0.5">{recentItems.slice(0, 3).map((item) => <NavRow key={item.href} item={item} compact />)}</div>
              </section>
            )}

            <section className="border-t border-white/[0.09] pt-4">
              <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#71899b]">Navigation</div>
              <div className="space-y-1">
                {visibleGroups.map((group) => {
                  const isOpen = expanded.includes(group.label);
                  const hasActive = group.items.some((item) => hrefMatches(pathname, item.href));
                  return (
                    <div key={group.label}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.label)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-[0.045em] transition ${hasActive ? 'bg-white/[0.07] text-white' : 'text-[#aabcc9] hover:bg-white/[0.05] hover:text-white'}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${hasActive ? 'bg-[#6fa1c8]' : 'bg-[#47667f]'}`} />
                        <span className="flex-1">{group.label}</span>
                        <span className="text-[9px] font-semibold text-[#6f8799]">{group.items.length}</span>
                        <span className={`text-[9px] text-[#6f8799] transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                      </button>
                      {isOpen && <div className="mt-1 space-y-0.5 pl-2">{group.items.map((item) => <NavRow key={item.href} item={item} compact />)}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.09] p-3">
        <div className="flex items-center gap-3 rounded-lg border border-white/[0.09] bg-[#0d263e] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-[#294e6c] text-xs font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">{displayName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium capitalize text-[#9db1c1]"><span className="h-1.5 w-1.5 rounded-full bg-[#79c79b]" />{role}</div>
          </div>
          {isOwner && <Link href="/owner" prefetch={false} onClick={onClose} className="rounded-md p-2 text-[#9fc0d8] transition hover:bg-white/[0.08] hover:text-white" title="Owner Control">◆</Link>}
          <Link href="/notifications" prefetch={false} onClick={onClose} className="rounded-md p-2 text-[#8fa6b7] transition hover:bg-white/[0.08] hover:text-white" title="Notifications">●</Link>
          {canManage && <Link href="/settings" prefetch={false} onClick={onClose} className="rounded-md p-2 text-[#8fa6b7] transition hover:bg-white/[0.08] hover:text-white" title="Settings">⚙</Link>}
        </div>
        <form action={logout} className="mt-2">
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.09] bg-transparent px-3 py-2.5 text-xs font-semibold text-[#c9d5de] transition hover:bg-white/[0.06] hover:text-white">↪ Log out</button>
        </form>
      </div>
    </aside>
  );
}
