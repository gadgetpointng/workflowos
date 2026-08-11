import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import TaskQuickCreate from '@/components/TaskQuickCreate';

const statusOrder = ['assigned', 'in_progress', 'submitted'] as const;

const statusStyles: Record<string, string> = {
  assigned: 'from-cyan-500 to-blue-500',
  in_progress: 'from-violet-500 to-fuchsia-500',
  submitted: 'from-emerald-400 to-teal-500',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-cyan-50 text-cyan-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-rose-50 text-rose-700',
};

export default async function Tasks() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: tasks }, { data: people }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*,assignee:profiles!tasks_assignee_id_fkey(id,full_name,email)')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('profiles')
      .select('id,full_name')
      .eq('organization_id', profile.organization_id)
      .eq('active', true)
      .order('full_name'),
  ]);

  const open = (tasks ?? []).filter(
    (task: any) => !['approved', 'completed', 'cancelled'].includes(task.status)
  );

  const overdue = open.filter(
    (task: any) => task.due_at && new Date(task.due_at) < new Date()
  ).length;

  return (
    <WorkspaceShell title="Tasks" subtitle="Execution workspace" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Execution</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Tasks</h1>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-600">Open</div>
              <div className="text-xl font-black text-slate-950">{open.length}</div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-rose-600">Overdue</div>
              <div className="text-xl font-black text-slate-950">{overdue}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500" />
            <div>
              <div className="text-lg font-black text-slate-950">Quick create</div>
              <div className="text-xs font-medium text-slate-500">Add work in seconds</div>
            </div>
          </div>
          <TaskQuickCreate people={(people ?? []) as any} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {statusOrder.map((status) => {
            const list = (tasks ?? []).filter((task: any) => task.status === status);
            return (
              <div key={status} className="rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-2xl bg-gradient-to-br ${statusStyles[status]}`} />
                    <span className="text-sm font-black capitalize text-slate-900">{status.replaceAll('_', ' ')}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{list.length}</span>
                </div>

                <div className="space-y-3">
                  {list.map((task: any) => (
                    <article key={task.id} className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-slate-900">{task.title}</h3>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${priorityStyles[task.priority] || priorityStyles.medium}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description}</p>}
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                        <span>{task.assignee?.full_name || 'Unassigned'}</span>
                        <span>{task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}</span>
                      </div>
                    </article>
                  ))}

                  {!list.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-medium text-slate-400">
                      No tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-950">Recent tasks</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{tasks?.length ?? 0}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(tasks ?? []).map((task: any) => (
              <div key={task.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 md:grid-cols-[1.4fr_.7fr_.8fr_.8fr] md:items-center">
                <div>
                  <div className="font-bold text-slate-900">{task.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{task.department || 'General'}</div>
                </div>
                <div>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black capitalize text-violet-700">
                    {task.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="font-medium text-slate-600">{task.assignee?.full_name || 'Unassigned'}</div>
                <div className="text-slate-500">{task.due_at ? new Date(task.due_at).toLocaleString() : '—'}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
