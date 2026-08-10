import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
export default async function ActivityPage(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const {data}=await supabase.from('activity_logs').select('*,profiles:actor_id(full_name,email)').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(100);
 return <WorkspaceShell title="Activity" subtitle="A traceable history of important work" profile={profile}><div className="mx-auto max-w-5xl px-6 py-8"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold">Organization activity</h1><p className="mt-2 text-slate-600">Audit-friendly events from staff actions, integrations and automations.</p><div className="mt-6 space-y-3">{(data??[]).map((a:any)=><div key={a.id} className="flex gap-4 rounded-2xl border p-4"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900"/><div className="min-w-0 flex-1"><div className="font-medium">{a.action}</div><div className="mt-1 text-sm text-slate-500">{a.profiles?.full_name||'System'} {a.entity_type?`· ${a.entity_type}`:''}</div><div className="mt-1 text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</div></div></div>)}{!data?.length&&<div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">No activity recorded yet.</div>}</div></div></div></WorkspaceShell>;
}
