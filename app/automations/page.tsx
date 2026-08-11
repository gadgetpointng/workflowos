import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AutomationRuleCreate from '@/components/AutomationRuleCreate';
import AutomationToggle from '@/components/AutomationToggle';

export default async function AutomationsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const [rulesQ, runsQ] = await Promise.all([
    supabase.from('automation_rules').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    supabase.from('automation_runs').select('*,automation_rules(name)').eq('organization_id', org).order('started_at', { ascending: false }).limit(20),
  ]);

  const rules = rulesQ.data ?? [];
  const runs = runsQ.data ?? [];
  const active = rules.filter((rule: any) => rule.active).length;

  return (
    <WorkspaceShell title="Automations" subtitle="Rules and runs" profile={profile}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-violet-500/40 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-400/25 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Automation</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Automation Center</h1>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-xl ring-1 ring-white/10">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-300">Active rules</div>
              <div className="mt-1 text-2xl font-black">{active}</div>
            </div>
          </div>
        </section>

        {canManage(profile.role) && (
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500" />
              <div>
                <div className="text-lg font-black text-slate-950">Create automation</div>
                <div className="text-xs font-medium text-slate-500">Build a repeatable rule</div>
              </div>
            </div>
            <AutomationRuleCreate />
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Rules</h2>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{rules.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              {rules.map((rule: any, index: number) => {
                const gradients = [
                  'from-violet-500 to-fuchsia-500',
                  'from-cyan-500 to-blue-500',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-rose-500',
                ];

                return (
                  <div key={rule.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <div className={`h-1 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                    <div className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-slate-900">{rule.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{rule.trigger_event} → {rule.action_type}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {rule.capability && <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{rule.capability}</span>}
                            {rule.priority && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-700">{rule.priority}</span>}
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${rule.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {rule.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                        </div>
                        {canManage(profile.role) && <AutomationToggle id={rule.id} active={rule.active} />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!rules.length && (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-6 text-sm font-medium text-slate-500">
                  No automation rules yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Recent runs</h2>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{runs.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              {runs.map((run: any) => (
                <div key={run.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">{run.automation_rules?.name || 'Automation'}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{run.trigger_event}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black capitalize ${run.status === 'completed' || run.status === 'success' ? 'bg-emerald-50 text-emerald-700' : run.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-violet-700'}`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}

              {!runs.length && (
                <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-6 text-sm font-medium text-slate-500">
                  Run history will appear here.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
