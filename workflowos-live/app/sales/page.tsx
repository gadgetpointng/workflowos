import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import DealQuickCreate from '@/components/DealQuickCreate';
import DealStageActions from '@/components/DealStageActions';
import FollowupCompleteButton from '@/components/FollowupCompleteButton';

const stages=['qualified','proposal','negotiation','won','lost'];
export default async function Sales(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login'); const org=profile.organization_id; const now=new Date().toISOString();
 const [deals,leads,staff,followups]=await Promise.all([
  supabase.from('deals').select('*').eq('organization_id',org).order('updated_at',{ascending:false}).limit(200),
  supabase.from('leads').select('id,name,phone,email,status,source').eq('organization_id',org).not('status','in','("lost","purchased")').order('created_at',{ascending:false}).limit(200),
  supabase.from('profiles').select('id,full_name,role').eq('organization_id',org).eq('active',true).order('full_name'),
  supabase.from('lead_followups').select('*').eq('organization_id',org).eq('status','pending').lte('due_at',now).order('due_at',{ascending:true}).limit(20)
 ]);
 const staffMap=new Map((staff.data??[]).map((s:any)=>[s.id,s.full_name])); const leadMap=new Map((leads.data??[]).map((l:any)=>[l.id,l]));
 const active=(deals.data??[]).filter((d:any)=>!['won','lost'].includes(d.stage)); const pipeline=active.reduce((s:number,d:any)=>s+Number(d.amount||0),0); const weighted=active.reduce((s:number,d:any)=>s+(Number(d.amount||0)*Number(d.probability||0)/100),0); const won=(deals.data??[]).filter((d:any)=>d.stage==='won').reduce((s:number,d:any)=>s+Number(d.amount||0),0);
 return <WorkspaceShell title="Sales" subtitle="Pipeline, follow-ups, quotes and conversion" profile={profile}><section className="page-heading"><div><div className="eyebrow">Revenue operations</div><h1>Sales command center</h1><p>Move leads into real deals, keep follow-ups on time, and see the value likely to close.</p></div><div className="metric-chip"><strong>₦{Math.round(weighted).toLocaleString()}</strong><span>weighted pipeline</span></div></section>
 <section className="metric-grid"><div className="metric-card"><span>Open pipeline</span><strong>₦{pipeline.toLocaleString()}</strong></div><div className="metric-card"><span>Weighted pipeline</span><strong>₦{Math.round(weighted).toLocaleString()}</strong></div><div className="metric-card"><span>Won value</span><strong>₦{won.toLocaleString()}</strong></div><div className="metric-card"><span>Follow-ups overdue</span><strong>{followups.data?.length??0}</strong></div></section>
 <section className="app-card p-5"><h2 className="section-title">Create a deal</h2><DealQuickCreate leads={leads.data??[]} staff={staff.data??[]}/></section>
 {(followups.data?.length??0)>0&&<section className="app-card mt-6 overflow-hidden"><div className="table-head"><span>Follow-ups needing attention</span><span>{followups.data?.length} due</span></div><div className="responsive-table">{(followups.data??[]).map((f:any)=>{const l:any=leadMap.get(f.lead_id);return <div className="table-row followup-row" key={f.id}><div><strong>{l?.name||l?.phone||l?.email||'Lead'}</strong><small>{f.channel} · {f.notes||'Follow up'}</small></div><div>{new Date(f.due_at).toLocaleString()}</div><div>{staffMap.get(f.assigned_to)||'Unassigned'}</div><div><FollowupCompleteButton id={f.id}/></div></div>})}</div></section>}
 <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{stages.map(stage=>{const list=(deals.data??[]).filter((d:any)=>d.stage===stage);const value=list.reduce((s:number,d:any)=>s+Number(d.amount||0),0);return <div className="kanban-column" key={stage}><div className="kanban-header"><span>{stage}</span><b>{list.length}</b></div><div className="mb-3 text-xs font-semibold text-slate-400">₦{value.toLocaleString()}</div><div className="space-y-3">{list.map((d:any)=><article className="deal-card" key={d.id}><div className="flex items-start justify-between gap-2"><h3>{d.title}</h3><span className="status-pill">{d.probability}%</span></div><p>{d.product_interest||d.source||'Sales opportunity'}</p><div className="deal-value">{d.currency||'NGN'} {Number(d.amount||0).toLocaleString()}</div><div className="lead-meta"><span>{staffMap.get(d.owner_id)||'Unassigned'}</span><span>{d.expected_close_at?new Date(d.expected_close_at).toLocaleDateString():'No close date'}</span></div><DealStageActions id={d.id} stage={d.stage}/></article>)}{!list.length&&<div className="empty-dropzone">No deals</div>}</div></div>})}</section>
 </WorkspaceShell>
}
