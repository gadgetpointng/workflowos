import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import GoalQuickCreate from '@/components/GoalQuickCreate';

export default async function Goals() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  return (
    <WorkspaceShell title="Goals" subtitle="Business outcomes" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Growth</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Goals</h1>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Active goals</div>
            <div className="text-xl font-black text-slate-950">{data?.length ?? 0}</div>
          </div>
        </section>

        {canManage(profile.role) && (
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500" />
              <div>
                <div className="text-lg font-black text-slate-950">Create goal</div>
                <div className="text-xs font-medium text-slate-500">Add a measurable target</div>
              </div>
            </div>
            <GoalQuickCreate />
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((goal: any, index: number) => {
            const target = Number(goal.target_value || 0);
            const current = Number(goal.current_value || 0);
            const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const gradients = [
              'from-emerald-400 to-teal-500',
              'from-cyan-500 to-blue-500',
              'from-violet-500 to-fuchsia-500',
              'from-orange-400 to-rose-500',
            ];

            return (
              <article key={goal.id} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{goal.metric || 'Goal'}</div>
                    <h2 className="mt-1 text-lg font-black text-slate-950">{goal.name}</h2>
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} text-sm font-black text-white`}>{pct}%</div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full bg-gradient-to-r ${gradients[index % gradients.length]}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">{current.toLocaleString()} current</span>
                  <span className="font-black text-slate-950">{target.toLocaleString()} target</span>
                </div>

                {goal.description && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{goal.description}</p>}
              </article>
            );
          })}

          {!data?.length && (
            <div className="rounded-[28px] border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-sm font-medium text-slate-500">No goals yet.</div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
