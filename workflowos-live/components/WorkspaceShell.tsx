'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

const nav = [
  ['Dashboard','/dashboard','⌂'],
  ['Today','/today','☀'],
  ['My Work','/my-work','▣'],
  ['Time','/time','◷'],
  ['Workload','/workload','▤'],
  ['Availability','/availability','◴'],
  ['Schedule','/schedule','▦'],
  ['SLA','/sla','⏱'],
  ['Performance','/performance','▲'],
  ['Reports','/reports','▧'],
  ['Recurring Work','/recurring-work','↻'],
  ['Inbox','/inbox','◉'],
  ['Approvals','/approvals','◫'],
  ['Opportunities','/opportunities','✦'],
  ['Buyer Intelligence','/buyers','⌕'],
  ['Buyer Radar','/buyers/radar','◉'],
  ['Tasks','/tasks','✓'],
  ['Leads','/leads','◎'],
  ['Customers','/customers','◉'],
  ['Sales','/sales','₦'],
  ['Quotes','/quotes','▤'],
  ['Campaigns','/campaigns','◈'],
  ['Automations','/automations','⚡'],
  ['Analytics','/analytics','▥'],
  ['Goals','/goals','◎'],
  ['Sites','/sites','◐'],
  ['Catalog','/catalog','▦'],
  ['Vendors','/vendors','♢'],
  ['Settlements','/settlements','₦'],
  ['Marketplaces','/marketplaces','◇'],
  ['Marketplace Jobs','/marketplace-jobs','⇄'],
  ['Integrations','/integrations','↗'],
  ['Integration Commands','/integration-commands','⇢'],
  ['Team','/team','♟'],
  ['Activity','/activity','◌'],
  ['Settings','/settings','⚙'],
  ['Launch Readiness','/launch-readiness','✓'],
  ['AI Proposals','/ai-proposals','⚙'],
  ['AI Assistant','/ai','✧']
] as const;

export default function WorkspaceShell({children, title, subtitle, profile}:{children:ReactNode;title?:string;subtitle?:string;profile?:{full_name?:string|null;role?:string|null}}){
  const pathname = usePathname();
  const [open,setOpen]=useState(false);
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{ if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{}); },[]);
  return <div className="webapp-shell">
    <aside className={`webapp-sidebar ${open?'is-open':''}`}>
      <div className="brand-lockup"><div className="brand-mark">W</div><div><div className="brand-name">WorkflowOS</div><div className="brand-meta">Growth execution web app</div></div></div>
      <nav className="workspace-nav">{nav.map(([label,href,icon])=>{const active=pathname===href||pathname.startsWith(`${href}/`);return <Link key={href} href={href} className={`workspace-nav-link ${active?'active':''}`}><span className="nav-icon">{icon}</span><span>{label}</span></Link>})}</nav>
      <div className="sidebar-footer"><div className="identity-dot"/><div className="min-w-0"><div className="truncate text-sm font-semibold">{profile?.full_name||'WorkflowOS user'}</div><div className="truncate text-xs capitalize text-slate-500">{profile?.role||'member'}</div></div></div>
    </aside>
    {open&&<button aria-label="Close navigation" className="sidebar-backdrop" onClick={()=>setOpen(false)}/>}
    <div className="webapp-main">
      <header className="webapp-topbar"><button className="mobile-menu-button" aria-label="Open navigation" onClick={()=>setOpen(true)}>☰</button><div className="min-w-0"><div className="topbar-title">{title||'WorkflowOS'}</div>{subtitle&&<div className="topbar-subtitle">{subtitle}</div>}</div><div className="topbar-actions"><Link href="/inbox" className="topbar-pill">Inbox</Link><span className="online-pill"><span className="online-dot"/>Online</span></div></header>
      <div className="webapp-content">{children}</div>
      <nav className="mobile-tabbar">{nav.slice(0,5).map(([label,href,icon])=>{const active=pathname===href||pathname.startsWith(`${href}/`);return <Link key={href} href={href} className={active?'active':''}><span>{icon}</span><small>{label==='Opportunities'?'Growth':label}</small></Link>})}</nav>
    </div>
  </div>
}
