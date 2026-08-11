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
        <Link href={item.href} prefetch onClick={onClose} className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all ${active ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30 ring-1 ring-white/20' : 'text-slate-100 hover:bg-white/[0.09] hover:text-white'}`}>
          <span className={`flex ${compact ? 'h-6 w-6' : 'h-7 w-7'} shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold ring-1 ring-white/10`}>{item.icon}</span>
          <span className="truncate font-semibold">{item.label}</span>
          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300" />}
        </Link>
        <button type="button" aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`} onClick={() => togglePin(item.href)} className={`h-8 w-8 shrink-0 rounded-lg text-xs transition ${pinned ? 'text-amber-300' : 'text-slate-500 opacity-0 hover:bg-white/10 hover:text-white group-hover/row:opacity-100'}`}>{pinned ? '★' : '☆'}</button>
      </div>
    );
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col overflow-hidden border-r border-cyan-300/20 bg-[#0b1738] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-1.5 bg-gradient-to-r from-cyan-300 via-blue-500 via-violet-500 to-pink-400" />
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-sm font-black shadow-lg shadow-blue-950/40">WO</div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-black">WorkflowOS</div><div className="mt-0.5 truncate text-[11px] font-semibold text-cyan-100/75">{isOwner ? 'Owner command center' : canManage ? 'Management workspace' : 'My operating workspace'}</div></div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 lg:hidden">×</button>
        </div>
        <div className="relative mt-3"><span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-400">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find anything…" className="w-full rounded-xl border border-white/10 bg-white/[0.07] py-2.5 pl-8 pr-3 text-xs font-semibold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/10" /></div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {query.trim() ? (
          <div><div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Search results</div><div className="space-y-0.5">{searchResults.map((item) => <NavRow key={item.href} item={item} />)}{!searchResults.length && <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs font-semibold text-slate-400">Nothing matches “{query}”.</div>}</div></div>
        ) : (
          <div className="space-y-4">
            {prefs.smartSidebar !== false && (
              <section><div className="mb-2 flex items-center justify-between px-2"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Focus now</span><span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-200">Smart</span></div><div className="space-y-0.5">{focusItems.map((item) => <NavRow key={item.href} item={item} />)}</div></section>
            )}
            {pinnedItems.length > 0 && <section><div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Pinned</div><div className="space-y-0.5">{pinnedItems.map((item) => <NavRow key={item.href} item={item} compact />)}</div></section>}
            {prefs.showRecent !== false && recentItems.length > 1 && <section><div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recent</div><div className="space-y-0.5">{recentItems.slice(0, 3).map((item) => <NavRow key={item.href} item={item} compact />)}</div></section>}
            <section className="border-t border-white/10 pt-3"><div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">All tools</div><div className="space-y-1">{visibleGroups.map((group) => { const isOpen = expanded.includes(group.label); const hasActive = group.items.some((item) => hrefMatches(pathname, item.href)); return <div key={group.label}><button type="button" onClick={() => toggleGroup(group.label)} className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-black transition ${hasActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}><span className={`h-1.5 w-1.5 rounded-full ${hasActive ? 'bg-cyan-300' : 'bg-slate-600'}`} /><span className="flex-1">{group.label}</span><span className="text-[10px] text-slate-500">{group.items.length}</span><span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span></button>{isOpen && <div className="mt-1 space-y-0.5 pl-2">{group.items.map((item) => <NavRow key={item.href} item={item} compact />)}</div>}</div>; })}</div></section>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-xs font-black">{initials}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{displayName}</div><div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold capitalize text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{role}</div></div>{isOwner && <Link href="/owner" onClick={onClose} className="rounded-lg p-2 text-cyan-300 transition hover:bg-white/10 hover:text-white" title="Owner Control">◆</Link>}<Link href="/notifications" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" title="Notifications">●</Link>{canManage && <Link href="/settings" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" title="Settings">⚙</Link>}</div>
        <form action={logout} className="mt-2"><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-xs font-bold text-slate-100 transition hover:bg-white/15 hover:text-white">↪ Log out</button></form>
      </div>
    </aside>
  );
}
