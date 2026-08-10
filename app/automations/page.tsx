import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AutomationRuleCreate from '@/components/AutomationRuleCreate';
import AutomationToggle from '@/components/AutomationToggle';

export default async function AutomationsPage(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login'); const org=profile.organization_id;
 const [rulesQ,runsQ]=await Promise.all([
  supabase.from('automation_rules').select('*').eq('organization_id',org).order('created_at',{ascending:false}),
  supabase.from('automation_runs').select('*,automation_rules(name)').eq('organization_id',org).order('started_at',{ascending:false}).limit(20)
 ]);
 const rules=rulesQ.data??[], runs=runsQ.data??[];
 return <WorkspaceShell title="Automations" subtitle="Turn business signals into repeatable staff actions" profile={profile}><div className="mx-auto max-w-7xl px-6 py-8 space-y-7">
  <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold uppercase tracking-[.2em] text-slate-500">Automation Center</div><h1 className="mt-2 text-3xl font-bold">Let WorkflowOS handle the repeatable work.</h1><p className="mt-2 text-slate-600">Rules listen for commerce, CRM and campaign events and turn them into tasks, notifications, leads or connector jobs.</p></div><div className="rounded-2xl bg-slate-900 px-4 py-3 text-white"><div className="text-2xl font-bold">{rules.filter((r:any)=>r.active).length}</div><div className="text-xs text-slate-300">active rules</div></div></div></section>
  {canManage(profile.role)&&<section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Create automation</h2><div className="mt-4"><AutomationRuleCreate/></div></section>}
  <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Rules</h2><div className="mt-4 space-y-3">{rules.map((r:any)=><div key={r.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{r.name}</div><div className="mt-1 text-sm text-slate-500">{r.trigger_event} → {r.action_type}</div><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2 py-1">{r.capability}</span><span className="rounded-full bg-slate-100 px-2 py-1">{r.priority}</span><span className={`rounded-full px-2 py-1 ${r.active?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{r.active?'Active':'Paused'}</span></div></div>{canManage(profile.role)&&<AutomationToggle id={r.id} active={r.active}/>}</div></div>)}{!rules.length&&<div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">No automation rules yet.</div>}</div></div>
  <div className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Recent runs</h2><div className="mt-4 space-y-3">{runs.map((r:any)=><div key={r.id} className="rounded-2xl border p-4"><div className="flex justify-between gap-3"><div><div className="font-medium">{r.automation_rules?.name||'Automation'}</div><div className="text-sm text-slate-500">{r.trigger_event}</div></div><span className="text-xs capitalize text-slate-500">{r.status}</span></div></div>)}{!runs.length&&<div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">Automation run history will appear here.</div>}</div></div></section>
 </div></WorkspaceShell>;
}
