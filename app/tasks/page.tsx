import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import TaskQuickCreate from '@/components/TaskQuickCreate';

const statusOrder = ['assigned', 'in_progress', 'submitted'] as const;

const statusStyles: Record<string, { dot: string; soft: string; border: string }> = {
  assigned: { dot: 'bg-[#2563a9]', soft: 'bg-[#edf3f8]', border: 'border-[#cbd8e3]' },
  in_progress: { dot: 'bg-[#52738f]', soft: 'bg-[#f1f5f8]', border: 'border-[#d7e0e8]' },
  submitted: { dot: 'bg-[#157347]', soft: 'bg-[#edf7f2]', border: 'border-[#c5e2d3]' },
};

const priorityStyles: Record<string, string> = {
  low: 'border-[#d7e0e8] bg-[#f2f6f9] text-[#53697c]',
  medium: 'border-[#cbd8e3] bg-[#edf3f8] text-[#315e82]',
  high: 'border-[#ead9a9] bg-[#fff5dc] text-[#946200]',
  urgent: 'border-[#efc4bf] bg-[#fcecea] text-[#b42318]',
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

  const open = (tasks ?? []).filter((task: any) => !['approved', 'completed', 'cancelled'].includes(task.status));
  const overdue = open.filter((task: any) => task.due_at && new Date(task.due_at) < new Date()).length;

  return (
    <WorkspaceShell title="Tasks" subtitle="Execution workspace" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5eb] pb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#52738f]">Execution</div>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-[#172b3a]">Tasks</h1>
            <p className="mt-2 text-sm text-[#687988]">Assign, progress and review work across the team.</p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-xl border border-[#cbd8e3] bg-[#edf3f8] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#52738f]">Open</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{open.length}</div>
            </div>
            <div className="rounded-xl border border-[#efc4bf] bg-[#fcecea] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#b42318]">Overdue</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{overdue}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#cbd8e3] bg-[#edf3f8] text-sm font-bold text-[#315e82]">+</div>
            <div>
              <div className="text-base font-bold text-[#172b3a]">Quick create</div>
              <div className="text-xs font-medium text-[#748391]">Add and assign work without leaving the board</div>
            </div>
          </div>
          <TaskQuickCreate people={(people ?? []) as any} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {statusOrder.map((status) => {
            const list = (tasks ?? []).filter((task: any) => task.status === status);
            const style = statusStyles[status];
            return (
              <div key={status} className="rounded-[16px] border border-[#dfe5eb] bg-[#f7f9fb] p-4">
                <div className="mb-4 flex items-center justify-between border-b border-[#e2e7ec] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className="text-sm font-bold capitalize text-[#32485b]">{status.replaceAll('_', ' ')}</span>
                  </div>
                  <span className="rounded-full border border-[#d7e0e8] bg-white px-2.5 py-1 text-[10px] font-bold tabular-nums text-[#5f6f7f]">{list.length}</span>
                </div>

                <div className="space-y-3">
                  {list.map((task: any) => (
                    <article key={task.id} className="rounded-xl border border-[#e0e6eb] bg-white p-4 shadow-[0_1px_2px_rgba(8,26,43,.03)] transition hover:border-[#c6d0d9]">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-[#263b4c]">{task.title}</h3>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.05em] ${priorityStyles[task.priority] || priorityStyles.medium}`}>{task.priority}</span>
                      </div>
                      {task.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#687988]">{task.description}</p>}
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf0f3] pt-3 text-xs font-medium text-[#748391]">
                        <span>{task.assignee?.full_name || 'Unassigned'}</span>
                        <span className="tabular-nums">{task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}</span>
                      </div>
                    </article>
                  ))}

                  {!list.length && <div className="rounded-xl border border-dashed border-[#ccd5de] bg-white/70 p-6 text-center text-sm font-medium text-[#8492a0]">No tasks here</div>}
                </div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e7ecf0] px-5 py-4 sm:px-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#748391]">Register</div>
              <h2 className="mt-0.5 text-lg font-bold text-[#172b3a]">Recent tasks</h2>
            </div>
            <span className="rounded-full border border-[#d7e0e8] bg-[#f7f9fb] px-3 py-1 text-xs font-bold tabular-nums text-[#5f6f7f]">{tasks?.length ?? 0}</span>
          </div>

          <div className="divide-y divide-[#edf0f3]">
            {(tasks ?? []).map((task: any) => (
              <div key={task.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 md:grid-cols-[1.4fr_.7fr_.8fr_.8fr] md:items-center">
                <div>
                  <div className="font-semibold text-[#263b4c]">{task.title}</div>
                  <div className="mt-1 text-xs text-[#8492a0]">{task.department || 'General'}</div>
                </div>
                <div><span className="rounded-full border border-[#cbd8e3] bg-[#edf3f8] px-2.5 py-1 text-[10px] font-bold capitalize text-[#315e82]">{task.status.replaceAll('_', ' ')}</span></div>
                <div className="font-medium text-[#53697c]">{task.assignee?.full_name || 'Unassigned'}</div>
                <div className="tabular-nums text-[#748391]">{task.due_at ? new Date(task.due_at).toLocaleString() : '—'}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
