import { redirect } from 'next/navigation';
import { canManage,requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AIProposalActions from '@/components/AIProposalActions';
import AIProposalCreate from '@/components/AIProposalCreate';

export default async function AIProposalsPage(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile)redirect('/login');
 const {data:items}=await supabase.from('ai_proposals').select('*').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(100);
 const pending=(items??[]).filter((x:any)=>x.status==='pending_approval').length;
 return <WorkspaceShell title="AI Proposals" subtitle="Controlled AI actions: propose → approve → execute" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">Controlled execution</div><h1>AI action proposals</h1><p>Turn recommendations into explicit, reviewable actions. WorkflowOS will not silently execute staff, campaign or marketplace changes.</p></div><div className="metric-chip"><strong>{pending}</strong><span>awaiting review</span></div></section>
  <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
   <section className="app-card p-5"><h2 className="section-title">New proposal</h2><AIProposalCreate/><div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Task, campaign and marketplace-job proposals can be executed after manager approval. Vendor and money-moving actions stay manual until dedicated settlement controls are connected.</div></section>
   <section className="app-card overflow-hidden"><div className="table-head"><span>Proposal queue</span><span>{items?.length??0}</span></div><div className="proposal-list">{(items??[]).map((p:any)=><article className="proposal-card" key={p.id}><div className="proposal-top"><div><span className="source-pill">{p.proposal_type.replaceAll('_',' ')}</span><h3>{p.title}</h3></div><span className="status-pill">{p.status.replaceAll('_',' ')}</span></div>{p.summary&&<p>{p.summary}</p>}<details><summary>Execution payload</summary><pre>{JSON.stringify(p.payload,null,2)}</pre></details><div className="proposal-footer"><small>{new Date(p.created_at).toLocaleString()}</small>{canManage(profile.role)&&<AIProposalActions id={p.id} status={p.status}/>}</div></article>)}{!(items??[]).length&&<div className="p-8 text-slate-500">No AI proposals yet.</div>}</div></section>
  </div>
 </WorkspaceShell>
}
