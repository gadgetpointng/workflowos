import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import LeadQuickCreate from '@/components/LeadQuickCreate';
import LeadFollowupQuickCreate from '@/components/LeadFollowupQuickCreate';

const stages=['new','contacted','interested','negotiating','purchased'];
export default async function Leads(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const {data:leads}=await supabase.from('leads').select('*,assignee:profiles!leads_assigned_to_fkey(id,full_name)').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(150);
 const pipeline=(leads??[]).filter((l:any)=>l.status!=='lost'); const value=pipeline.reduce((sum:number,l:any)=>sum+Number(l.estimated_value||0),0);
 return <WorkspaceShell title="Leads" subtitle="Sales pipeline across every connected channel" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">CRM</div><h1>Lead pipeline</h1><p>WhatsApp, storefront and marketplace inquiries can land here and become follow-up work.</p></div><div className="metric-chip"><strong>{pipeline.length}</strong><span>active leads</span></div></section>
  <section className="app-card p-5"><h2 className="section-title">Capture a lead</h2><LeadQuickCreate/></section>
  <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{stages.map(stage=>{const list=(leads??[]).filter((l:any)=>l.status===stage);return <div className="kanban-column" key={stage}><div className="kanban-header"><span>{stage}</span><b>{list.length}</b></div><div className="space-y-3">{list.map((l:any)=><article className="lead-card" key={l.id}><div className="flex items-start justify-between gap-2"><h3>{l.name||l.phone||l.email||'Unnamed lead'}</h3>{l.source&&<span className="source-pill">{l.source}</span>}</div><p>{l.product_interest||'General inquiry'}</p><div className="lead-meta"><span>{l.assignee?.full_name||'Unassigned'}</span>{l.estimated_value&&<strong>₦{Number(l.estimated_value).toLocaleString()}</strong>}</div><div className="mt-3"><LeadFollowupQuickCreate leadId={l.id} assigneeId={l.assigned_to}/></div></article>)}{!list.length&&<div className="empty-dropzone">No leads</div>}</div></div>})}</section>
  <div className="mt-6 text-sm text-slate-500">Visible estimated pipeline value: ₦{value.toLocaleString()}</div>
 </WorkspaceShell>
}
