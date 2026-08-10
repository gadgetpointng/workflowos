import { redirect } from 'next/navigation';
import { requireUser,canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import ApprovalActions from '@/components/ApprovalActions';

export default async function Approvals(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const {data:items}=await supabase.from('approvals').select('*,requester:profiles!approvals_requested_by_fkey(full_name),approver:profiles!approvals_approver_id_fkey(full_name)').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(100);
 const pending=(items??[]).filter((x:any)=>x.status==='pending');
 return <WorkspaceShell title="Approvals" subtitle="Manager review for submitted work and sensitive actions" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">Control</div><h1>Approval queue</h1><p>Keep high-impact work controlled without slowing staff execution.</p></div><div className="metric-chip"><strong>{pending.length}</strong><span>pending</span></div></section>
  <section className="app-card overflow-hidden"><div className="table-head"><span>Requests</span><span>{items?.length??0}</span></div><div className="responsive-table">{(items??[]).map((a:any)=><div className="table-row approval-row" key={a.id}><div><strong>{a.entity_type.replaceAll('_',' ')}</strong><small>{a.requester?.full_name||'System'} · {new Date(a.created_at).toLocaleString()}</small></div><div><span className="status-pill">{a.status}</span></div><div>{a.notes||'No notes'}</div><div>{a.status==='pending'&&canManage(profile.role)?<ApprovalActions id={a.id}/>:a.approver?.full_name||'—'}</div></div>)}{!(items??[]).length&&<div className="p-8 text-slate-500">No approval requests.</div>}</div></section>
 </WorkspaceShell>
}
