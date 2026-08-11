import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function TimePage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data } = await supabase
    .from('time_entries')
    .select('*,task:tasks(title)')
    .eq('organization_id', profile.organization_id)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(100);

  const rows = data ?? [];
  const mins = rows.reduce(
    (total: number, entry: any) =>
      total +
      (entry.ended_at
        ? Math.max(
            0,
            (new Date(entry.ended_at).getTime() -
              new Date(entry.started_at).getTime()) /
              60000
          )
        : 0),
    0
  );
  const hours = Math.round((mins / 60) * 10) / 10;
  const running = rows.filter((entry: any) => !entry.ended_at).length;

  return (
    <WorkspaceShell title="Time" subtitle="Work sessions" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
              Execution
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Time & focus
            </h1>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Logged</div>
              <div className="text-xl font-black text-slate-950">{hours}h</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Running</div>
              <div className="text-xl font-black text-slate-950">{running}</div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-950">Recent sessions</h2>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{rows.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((entry: any, index: number) => {
              const duration = entry.ended_at
                ? Math.round(
                    (new Date(entry.ended_at).getTime() -
                      new Date(entry.started_at).getTime()) /
                      60000
                  )
                : null;
              const dotStyles = [
                'from-violet-500 to-fuchsia-500',
                'from-cyan-500 to-blue-500',
                'from-emerald-400 to-teal-500',
                'from-orange-400 to-rose-500',
              ];

              return (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br ${dotStyles[index % dotStyles.length]}`} />
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">{entry.task?.title || 'Task'}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">{new Date(entry.started_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${duration == null ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {duration == null ? 'Running now' : `${duration} min`}
                  </span>
                </div>
              );
            })}

            {!rows.length && (
              <div className="p-8 text-sm font-medium text-slate-500">No work sessions logged yet.</div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
