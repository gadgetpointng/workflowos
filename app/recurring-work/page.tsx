import RecurringBatchRunButton from '@/components/RecurringBatchRunButton';
import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import RecurringWorkCreate from '@/components/RecurringWorkCreate';
import RecurringRunButton from '@/components/RecurringRunButton';

const cadenceStyles: Record<string, string> = {
  daily: 'bg-cyan-50 text-cyan-700',
  weekly: 'bg-violet-50 text-violet-700',
  monthly: 'bg-emerald-50 text-emerald-700',
};

export default async function RecurringWork() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: templates }, { data: people }, { data: runs }] = await Promise.all([
    supabase.from('recurring_work_templates').select('*,assignee:profiles!recurring_work_templates_assignee_id_fkey(full_name)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,full_name').eq('organization_id', profile.organization_id).eq('active', true).order('full_name'),
    supabase.from('recurring_work_runs').select('id,template_id,task_id,status,created_at').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }).limit(25),
  ]);

  const last = new Map<string, any>();
  for (const run of runs ?? []) {
    if (!last.has(run.template_id)) last.set(run.template_id, run);
  }

  const activeCount = (templates ?? []).filter((template: any) => template.active).length;

  return (
    <WorkspaceShell title="Recurring Work" subtitle="Operating routines" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">Planning</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Recurring work</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Active routines</div>
              <div className="text-xl font-black text-slate-950">{activeCount}</div>
            </div>
            {canManage(profile.role) && <RecurringBatchRunButton />}
          </div>
        </section>

        {canManage(profile.role) && (
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500" />
              <div>
                <div className="text-lg font-black text-slate-950">Create routine</div>
                <div className="text-xs font-medium text-slate-500">Make repeatable work automatic</div>
              </div>
            </div>
            <RecurringWorkCreate people={(people ?? []) as any} />
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          {(templates ?? []).map((template: any, index: number) => {
            const lastRun = last.get(template.id);
            const gradients = [
              'from-fuchsia-500 to-violet-500',
              'from-cyan-500 to-blue-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
            ];
            return (
              <article key={template.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
                <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${cadenceStyles[template.cadence] || 'bg-slate-100 text-slate-600'}`}>
                        {template.cadence}
                      </span>
                      <h2 className="mt-3 text-lg font-black text-slate-950">{template.name}</h2>
                      {template.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{template.description}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${template.priority === 'urgent' ? 'bg-rose-50 text-rose-700' : template.priority === 'high' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                      {template.priority}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-cyan-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Assignee</div>
                      <div className="mt-1 truncate text-sm font-bold text-slate-950">{template.assignee?.full_name || 'Unassigned'}</div>
                    </div>
                    <div className="rounded-2xl bg-violet-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Next run</div>
                      <div className="mt-1 text-sm font-bold text-slate-950">{template.next_run_at ? new Date(template.next_run_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="text-xs font-medium text-slate-500">{lastRun ? `Last generated ${new Date(lastRun.created_at).toLocaleString()}` : 'Not generated yet'}</span>
                    {canManage(profile.role) && <RecurringRunButton id={template.id} />}
                  </div>
                </div>
              </article>
            );
          })}

          {!templates?.length && (
            <div className="rounded-[28px] border border-dashed border-violet-200 bg-violet-50/60 p-8 text-sm font-medium text-slate-500">No recurring work configured yet.</div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
