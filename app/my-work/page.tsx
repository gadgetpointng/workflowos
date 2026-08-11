import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import TaskTransitionActions from '@/components/TaskTransitionActions';
import TimeEntryButton from '@/components/TimeEntryButton';

const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-cyan-50 text-cyan-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-rose-50 text-rose-700',
};

export default async function MyWork() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: running } = await supabase
    .from('time_entries')
    .select('task_id')
    .eq('organization_id', profile.organization_id)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('assignee_id', user.id)
    .not('status', 'in', '("completed","cancelled")')
    .order('due_at', { ascending: true })
    .limit(100);

  const overdue = (tasks ?? []).filter(
    (task: any) =>
      task.due_at &&
      new Date(task.due_at) < new Date() &&
      !['submitted', 'approved', 'completed'].includes(task.status)
  );

  return (
    <WorkspaceShell title="My Work" subtitle="Assigned work" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Staff workspace</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">My work</h1>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Assigned</div>
              <div className="text-xl font-black text-slate-950">{tasks?.length ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Overdue</div>
              <div className="text-xl font-black text-slate-950">{overdue.length}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(tasks ?? []).map((task: any, index: number) => {
            const gradients = [
              'from-violet-500 to-fuchsia-500',
              'from-cyan-500 to-blue-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
            ];

            return (
              <article key={task.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black capitalize text-violet-700">
                      {task.status.replaceAll('_', ' ')}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${priorityStyles[task.priority] || priorityStyles.medium}`}>
                      {task.priority}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-black text-slate-950">{task.title}</h2>
                  {task.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description}</p>}

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                    <div className="rounded-2xl bg-slate-50 p-3">{task.department || 'General'}</div>
                    <div className="rounded-2xl bg-slate-50 p-3">{task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}</div>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <TaskTransitionActions id={task.id} status={task.status} />
                    <TimeEntryButton taskId={task.id} running={running?.task_id === task.id} />
                  </div>
                </div>
              </article>
            );
          })}

          {!tasks?.length && (
            <div className="rounded-[28px] border border-dashed border-violet-200 bg-violet-50/60 p-8 text-sm font-medium text-slate-500">
              You have no open assigned tasks.
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
