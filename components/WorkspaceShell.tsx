'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useMemo,useState } from 'react';
import type { ReactNode } from 'react';
import SmartSidebar from '@/components/SmartSidebar';
import NotificationSoundController from '@/components/NotificationSoundController';
import { normalizeWorkflowOSPermissions,scopeForNavigationHref } from '@/lib/workflow-access';

type Item={label:string;href:string;icon:string}; type Group={label:string;items:Item[]};
const navGroups:Group[]=[
 {label:'Home',items:[['Overview','/dashboard','⌂'],['Today','/today','☀'],['Daily Briefing','/briefing','◫'],['My Work','/my-work','▤'],['Notifications','/notifications','●'],['Inbox','/inbox','◎']].map(([label,href,icon])=>({label,href,icon}))},
 {label:'Work Management',items:[['Tasks','/tasks','✓'],['Approvals','/approvals','◇'],['Schedule','/schedule','▦'],['Recurring Work','/recurring-work','↻'],['Follow-up SLA','/follow-up-sla','⏱'],['SLA Rules','/sla','◷'],['Time','/time','◴'],['Workload','/workload','▤'],['Availability','/availability','◌']].map(([label,href,icon])=>({label,href,icon}))},
 {label:'Buyers & Sales',items:[['Buyer Acquisition','/acquisition','↗'],['Buyer Intelligence','/buyers','⌕'],['Buyer Radar','/buyers/radar','◉'],['Leads','/leads','◎'],['Customers','/customers','◉'],['Quotes','/quotes','▱'],['Sales','/sales','₦'],['Opportunities','/opportunities','✦'],['Revenue Rescue','/revenue-rescue','₦'],['Campaigns','/campaigns','☆'],['Goals','/goals','◎']].map(([label,href,icon])=>({label,href,icon}))},
 {label:'Store & Supply',items:[['Catalog','/catalog','▦'],['Sites','/sites','◐'],['Vendors','/vendors','♢'],['Marketplaces','/marketplaces','◇'],['Marketplace Jobs','/marketplace-jobs','⇄'],['Settlements','/settlements','₦']].map(([label,href,icon])=>({label,href,icon}))},
 {label:'Insights & Automation',items:[['Automations','/automations','⚡'],['Analytics','/analytics','⌁'],['Performance','/performance','▲'],['Reports','/reports','▧'],['AI Assistant','/ai','✧'],['AI Proposals','/ai-proposals','✦']].map(([label,href,icon])=>({label,href,icon}))},
 {label:'Team & Administration',items:[['Owner Control','/owner','◆'],['Owner Communications','/owner-communications','✦'],['Team','/team','♙'],['Team Pulse','/team/pulse','♙'],['Branch Radar','/branch-radar','⌁'],['Activity','/activity','◌'],['Integrations','/integrations','↗'],['Integration Commands','/integration-commands','⇢'],['Settings','/settings','⚙'],['Launch Readiness','/launch-readiness','✓']].map(([label,href,icon])=>({label,href,icon}))}
];
const mobile:Item[]=[{label:'Home',href:'/dashboard',icon:'⌂'},{label:'Today',href:'/today',icon:'☀'},{label:'Buyers',href:'/buyers',icon:'⌕'},{label:'Tasks',href:'/tasks',icon:'✓'}];

export default function WorkspaceShell({children,title,subtitle,profile}:{children:ReactNode;title?:string;subtitle?:string;profile?:{full_name?:string|null;role?:string|null;workflowos_identity_source?:string|null;workflowos_access_enabled?:boolean|null;workflowos_permissions?:string[]|null}}){
 const pathname=usePathname(); const [open,setOpen]=useState(false); const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
 const staff=profile?.workflowos_identity_source==='gadgetpoint-staff-authorization-code';
 const permissions=useMemo(()=>normalizeWorkflowOSPermissions(profile?.workflowos_permissions),[profile?.workflowos_permissions]);
 const canOpen=(href:string)=>{if(!staff)return true;if(profile?.workflowos_access_enabled!==true)return false;const needed=scopeForNavigationHref(href);return needed===null?true:needed==='owner'?false:permissions.includes(needed)};
 const groups=useMemo(()=>navGroups.map(g=>({...g,items:g.items.filter(i=>canOpen(i.href))})).filter(g=>g.items.length),[staff,profile?.workflowos_access_enabled,permissions]);
 const mobileItems=useMemo(()=>mobile.filter(i=>canOpen(i.href)),[staff,profile?.workflowos_access_enabled,permissions]);
 const all=groups.flatMap(g=>g.items); const active=all.filter(i=>pathname===i.href||pathname.startsWith(`${i.href}/`)).sort((a,b)=>b.href.length-a.href.length)[0];
 useEffect(()=>setOpen(false),[pathname]); useEffect(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})},[]);
 return <div className="min-h-screen bg-[#f7f7f7] text-[#171717]" style={{colorScheme:'light'}}>
  <NotificationSoundController/>{open&&<button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={()=>setOpen(false)}/>} {(!sidebarCollapsed||open)&&<SmartSidebar pathname={pathname} open={open} onClose={()=>setOpen(false)} navGroups={groups} profile={profile}/>} 
  <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed?'lg:pl-0':'lg:pl-[292px]'}`}>
   <header className="sticky top-0 z-30 border-b border-[#e5e5e5] bg-[#fbfbfb]/95 backdrop-blur-xl"><div className="flex min-h-[56px] items-center gap-3 px-4 sm:px-6 lg:px-7">
    <button aria-label="Open navigation" onClick={()=>setOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-md border bg-white lg:hidden">☰</button>
    <button aria-label={sidebarCollapsed?'Show sidebar':'Hide sidebar'} title={sidebarCollapsed?'Show sidebar':'Hide sidebar'} onClick={()=>setSidebarCollapsed(value=>!value)} className="hidden h-8 w-8 items-center justify-center rounded-md border bg-white text-sm text-[#425466] transition hover:bg-[#f3f5f7] lg:flex">{sidebarCollapsed?'☰':'←'}</button>
    <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]"><span>WorkflowOS</span><span>/</span><span className="truncate font-medium text-[#404040]">{title||active?.label||'Workspace'}</span></div>{subtitle&&<div className="mt-0.5 truncate text-[10px] text-[#a3a3a3]">{subtitle}</div>}</div>
    <div className="hidden items-center gap-2 sm:flex"><span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-700">● Live</span>{canOpen('/notifications')&&<Link href="/notifications" className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium">Alerts</Link>}{canOpen('/acquisition')&&<Link href="/acquisition" className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium">Get Buyers</Link>}{canOpen('/ai')&&<Link href="/ai" className="rounded-md bg-[#2e8b67] px-3 py-1.5 text-xs font-medium text-white">AI</Link>}</div>
   </div></header><main className="w-full px-4 pb-32 pt-5 sm:px-6 lg:px-7 lg:pb-10 lg:pt-6">{children}</main>
  </div>
  <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"><nav className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-xl border bg-white/96 p-1.5 shadow-lg">{mobileItems.map(i=>{const on=pathname===i.href||pathname.startsWith(`${i.href}/`);return <Link key={i.href} href={i.href} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 ${on?'bg-emerald-50':''}`}><span className={`flex h-7 w-7 items-center justify-center rounded-md text-[13px] ${on?'bg-[#2e8b67] text-white':'bg-slate-100'}`}>{i.icon}</span><span className="max-w-full truncate text-[10px]">{i.label}</span></Link>})}<button onClick={()=>setOpen(true)} className="flex flex-col items-center gap-1 rounded-lg px-1 py-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">☰</span><span className="text-[10px]">More</span></button></nav></div>
 </div>
}
