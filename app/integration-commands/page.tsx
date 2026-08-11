import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import IntegrationCommandActions from '@/components/IntegrationCommandActions';
import { canManage, requireUser } from '@/lib/auth';

const statusStyles: Record<string, string> = {
  pending: 'bg-violet-50 text-violet-700',
  queued: 'bg-cyan-50 text-cyan-700',
  processing: 'bg-orange-50 text-orange-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

export default async function IntegrationCommandsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data } = await supabase
    .from('integration_commands')
    .select('*,external_integrations(name,slug)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  const commands = data ?? [];
  const userCanManage = canManage(profile.role);
  const pending = commands.filter((row: any) => ['pending', 'queued'].includes(row.status)).length;

  return (
    <WorkspaceShell title="Integration Commands" subtitle="External change requests" profile={profile}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Boundary safe</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Command queue</h1>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-200">Waiting</div>
              <div className="mt-1 text-2xl font-black">{pending}</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {commands.map((row: any, index: number) => {
            const gradients = [
              'from-cyan-500 to-blue-500',
              'from-violet-500 to-fuchsia-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
            ];
            const normalized = String(row.status ?? '').replaceAll('_', ' ');
            return (
              <article key={row.id} className="overflow-hidden rounded-[26px] border border-white/80 bg-white/90 shadow-sm">
                <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-black text-slate-950">{row.command_type}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {row.external_integrations?.name ?? 'Integration'} · {row.target_entity_type ?? 'external entity'}{row.target_entity_id ? ` #${row.target_entity_id}` : ''}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[row.status] || 'bg-slate-100 text-slate-600'}`}>
                      {normalized}
                    </span>
                  </div>

                  {row.attempt_count > 0 && (
                    <div className="mt-4 rounded-2xl bg-orange-50/70 p-3 text-xs font-semibold text-orange-800">
                      {row.attempt_count} attempt{row.attempt_count === 1 ? '' : 's'}{row.last_error ? ` · ${row.last_error}` : ''}
                    </div>
                  )}

                  <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">Payload</summary>
                    <pre className="mt-3 overflow-x-auto text-xs text-slate-600">{JSON.stringify(row.payload ?? {}, null, 2)}</pre>
                  </details>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <IntegrationCommandActions id={row.id} status={row.status} canManage={userCanManage} />
                  </div>
                </div>
              </article>
            );
          })}

          {!commands.length && (
            <div className="rounded-[28px] border border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-sm font-medium text-slate-500">No external change requests yet.</div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
