import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import TaskTransitionActions from '@/components/TaskTransitionActions';
import TimeEntryButton from '@/components/TimeEntryButton';

export default async function MyWork(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const {data:running}=await supabase.from('time_entries').select('task_id').eq('organization_id',profile.organization_id).eq('user_id',user.id).is('ended_at',null).maybeSingle();
 const {data:tasks}=await supabase.from('tasks').select('*').eq('organization_id',profile.organization_id).eq('assignee_id',user.id).not('status','in','("completed","cancelled")').order('due_at',{ascending:true}).limit(100);
 const overdue=(tasks??[]).filter((t:any)=>t.due_at&&new Date(t.due_at)<new Date()&&!['submitted','approved','completed'].includes(t.status));
 return <WorkspaceShell title="My Work" subtitle="Your assigned work across campaigns, sales and operations" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">Staff workspace</div><h1>My work</h1><p>Accept assignments, start work and submit results from phone or desktop.</p></div><div className="flex gap-2"><div className="metric-chip"><strong>{tasks?.length??0}</strong><span>assigned</span></div><div className="metric-chip danger"><strong>{overdue.length}</strong><span>overdue</span></div></div></section>
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(tasks??[]).map((t:any)=><article key={t.id} className="app-card p-5"><div className="flex items-start justify-between gap-3"><span className="status-pill">{t.status.replaceAll('_',' ')}</span><span className={`priority priority-${t.priority}`}>{t.priority}</span></div><h2 className="mt-3 text-lg font-semibold">{t.title}</h2><p className="mt-2 text-sm text-slate-600">{t.description||'No description'}</p><div className="task-meta mt-4"><span>{t.department||'General'}</span><span>{t.due_at?new Date(t.due_at).toLocaleString():'No due date'}</span></div><TaskTransitionActions id={t.id} status={t.status}/><TimeEntryButton taskId={t.id} running={running?.task_id===t.id}/></article>)}{!(tasks??[]).length&&<div className="app-card p-8 text-slate-500">You have no open assigned tasks.</div>}</section>
 </WorkspaceShell>
}
