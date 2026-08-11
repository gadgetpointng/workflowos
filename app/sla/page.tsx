import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import { SLAScan, SLAResolve } from '@/components/SLAControls';

export default async function Page() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: incidents }, { data: rules }] = await Promise.all([
    supabase.from('sla_incidents').select('*,assignee:profiles!sla_incidents_assigned_to_fkey(full_name),rule:sla_rules(name,response_minutes)').eq('organization_id', profile.organization_id).order('due_at', { ascending: true }).limit(100),
    supabase.from('sla_rules').select('*').eq('organization_id', profile.organization_id).eq('active', true),
  ]);

  const open = (incidents ?? []).filter((incident: any) => !['resolved', 'cancelled'].includes(incident.status));
  const breached = open.filter((incident: any) => incident.status === 'breached').length;

  const metrics = [
    ['Open', open.length, 'from-cyan-500 to-blue-500'],
    ['Breached', breached, 'from-orange-400 to-rose-500'],
    ['Active rules', rules?.length || 0, 'from-emerald-400 to-teal-500'],
  ] as const;

  return (
    <WorkspaceShell title="SLA" subtitle="Response-time control" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Service control</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">SLA & escalation</h1>
          </div>
          {canManage(profile.role) && <SLAScan />}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map(([label, value, gradient]) => (
            <div key={label} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${gradient}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          {open.map((incident: any) => {
            const isBreached = incident.status === 'breached';
            return (
              <article key={incident.id} className="grid gap-4 rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black text-white ${isBreached ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-gradient-to-br from-cyan-500 to-blue-500'}`}>
                  {isBreached ? '!' : '⏱'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-black capitalize text-slate-950">{incident.entity_type} · {incident.entity_id.slice(0, 8)}</div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${isBreached ? 'bg-rose-50 text-rose-700' : 'bg-cyan-50 text-cyan-700'}`}>
                      {incident.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{incident.rule?.name || 'SLA'} · {incident.source || 'any source'} · {incident.assignee?.full_name || 'Unassigned'}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-400">Due {new Date(incident.due_at).toLocaleString()}</div>
                </div>
                <div>{canManage(profile.role) && <SLAResolve id={incident.id} />}</div>
              </article>
            );
          })}

          {!open.length && (
            <div className="rounded-[28px] border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-sm font-medium text-slate-500">No open SLA incidents.</div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
