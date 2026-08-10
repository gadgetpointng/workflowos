import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import RecommendationActions from '@/components/RecommendationActions';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function OpportunitiesPage(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const {data:recs}=await supabase.from('growth_recommendations').select('*,profiles:recommended_assignee(full_name,email,role)').eq('organization_id',profile.organization_id).order('score',{ascending:false}).order('created_at',{ascending:false}).limit(100);
 const newCount=(recs??[]).filter(r=>r.status==='new').length;
 return <WorkspaceShell title="Opportunity Center" subtitle="What WorkflowOS recommends next" profile={profile}>
  <div className="text-sm font-semibold uppercase tracking-[.2em] text-slate-500">Decision engine</div><h1 className="mt-2 text-3xl font-bold">Opportunity Center</h1><p className="mt-2 max-w-3xl text-slate-600">Live recommendations generated from commerce signals, customer conversations, marketplace demand and connected business activity.</p>
  <div className="mt-6 flex gap-3"><span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">{newCount} new</span><span className="rounded-full border px-3 py-1.5 text-xs font-semibold">{recs?.length??0} total</span></div>
  <div className="mt-8 space-y-4">{(recs??[]).map((r:any)=><article key={r.id} className="rounded-3xl border bg-white p-6 shadow-sm"><div className="grid gap-5 md:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">{r.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">Score {Number(r.score).toFixed(0)}</span><span className="rounded-full border px-2.5 py-1 text-xs capitalize">{r.status}</span></div><p className="mt-2 text-sm text-slate-600">{r.rationale||'No rationale supplied.'}</p><div className="mt-3 text-xs text-slate-500">Type: {r.recommendation_type} · Recommended staff: {r.profiles?.full_name||'Unassigned'}</div></div><div className="md:min-w-64"><RecommendationActions id={r.id} hasTask={Boolean(r.created_task_id)}/></div></div></article>)}
  {(!recs||recs.length===0)&&<div className="rounded-3xl border border-dashed p-10 text-center text-slate-500">No recommendations yet. Run the decision engine after commerce signals arrive.</div>}</div>
 </WorkspaceShell>
}