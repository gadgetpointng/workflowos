import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import TaskQuickCreate from '@/components/TaskQuickCreate';

const statusOrder=['draft','assigned','in_progress','submitted','approved','completed'];
export default async function Tasks(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const [{data:tasks},{data:people}]=await Promise.all([
  supabase.from('tasks').select('*,assignee:profiles!tasks_assignee_id_fkey(id,full_name,email)').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(100),
  supabase.from('profiles').select('id,full_name').eq('organization_id',profile.organization_id).eq('active',true).order('full_name')
 ]);
 const open=(tasks??[]).filter((t:any)=>!['approved','completed','cancelled'].includes(t.status));
 return <WorkspaceShell title="Tasks" subtitle="Assign, execute and approve work" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">Execution</div><h1>Tasks</h1><p>Turn recommendations, campaigns and customer activity into clear staff work.</p></div><div className="metric-chip"><strong>{open.length}</strong><span>open</span></div></section>
  <section className="app-card p-5"><h2 className="section-title">Quick create</h2><TaskQuickCreate people={(people??[]) as any}/></section>
  <section className="mt-6 grid gap-4 xl:grid-cols-3">{statusOrder.slice(1,4).map(status=>{const list=(tasks??[]).filter((t:any)=>t.status===status);return <div className="kanban-column" key={status}><div className="kanban-header"><span>{status.replaceAll('_',' ')}</span><b>{list.length}</b></div><div className="space-y-3">{list.map((t:any)=><article key={t.id} className="task-card"><div className="flex items-start justify-between gap-3"><h3>{t.title}</h3><span className={`priority priority-${t.priority}`}>{t.priority}</span></div><p>{t.description||'No description'}</p><div className="task-meta"><span>{t.assignee?.full_name||'Unassigned'}</span><span>{t.due_at?new Date(t.due_at).toLocaleDateString():'No due date'}</span></div></article>)}{!list.length&&<div className="empty-dropzone">No tasks here</div>}</div></div>})}</section>
  <section className="app-card mt-6 overflow-hidden"><div className="table-head"><span>All recent tasks</span><span>{tasks?.length??0}</span></div><div className="responsive-table">{(tasks??[]).map((t:any)=><div className="table-row" key={t.id}><div><strong>{t.title}</strong><small>{t.department||'General'}</small></div><div><span className="status-pill">{t.status.replaceAll('_',' ')}</span></div><div>{t.assignee?.full_name||'Unassigned'}</div><div>{t.due_at?new Date(t.due_at).toLocaleString():'—'}</div></div>)}</div></section>
 </WorkspaceShell>
}
