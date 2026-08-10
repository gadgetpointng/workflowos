import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import CampaignQuickCreate from '@/components/CampaignQuickCreate';
import CampaignTaskGenerator from '@/components/CampaignTaskGenerator';

export default async function Campaigns(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const {data:campaigns}=await supabase.from('campaigns').select('*,owner:profiles!campaigns_owner_id_fkey(full_name),campaign_tasks(task_id)').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(100);
 const active=(campaigns??[]).filter((c:any)=>c.status==='active').length; const planned=(campaigns??[]).filter((c:any)=>['draft','planned'].includes(c.status)).length;
 return <WorkspaceShell title="Campaigns" subtitle="Plan growth work and connect it to staff execution" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">Growth execution</div><h1>Campaign manager</h1><p>Create campaigns, connect staff tasks, budgets and timelines, then measure what turns into sales.</p></div><div className="flex gap-2"><div className="metric-chip"><strong>{active}</strong><span>active</span></div><div className="metric-chip"><strong>{planned}</strong><span>planned</span></div></div></section>
  <section className="app-card p-5"><h2 className="section-title">New campaign</h2><CampaignQuickCreate/></section>
  <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(campaigns??[]).map((c:any)=><article key={c.id} className="app-card p-5"><div className="flex items-start justify-between gap-3"><div><span className="status-pill">{c.status}</span><h2 className="mt-3 text-xl font-semibold">{c.name}</h2></div>{c.budget!=null&&<strong>₦{Number(c.budget).toLocaleString()}</strong>}</div><p className="mt-3 text-sm text-slate-600">{c.objective||'No objective yet.'}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><small>Audience</small><div>{c.target_audience||'—'}</div></div><div><small>Owner</small><div>{c.owner?.full_name||'Unassigned'}</div></div><div><small>Starts</small><div>{c.starts_at?new Date(c.starts_at).toLocaleDateString():'—'}</div></div><div><small>Tasks</small><div>{c.campaign_tasks?.length??0}</div></div></div><div className="mt-4"><CampaignTaskGenerator campaignId={c.id}/></div></article>)}{!(campaigns??[]).length&&<div className="app-card p-8 text-slate-500">No campaigns yet. Create the first one above.</div>}</section>
 </WorkspaceShell>
}
