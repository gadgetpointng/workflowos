import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const metricStyles = [
  ['from-emerald-400 to-teal-500', 'text-emerald-700', 'bg-emerald-50'],
  ['from-cyan-500 to-blue-500', 'text-cyan-700', 'bg-cyan-50'],
  ['from-violet-500 to-fuchsia-500', 'text-violet-700', 'bg-violet-50'],
  ['from-orange-400 to-rose-500', 'text-orange-700', 'bg-orange-50'],
] as const;

export default async function Analytics() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ count: leads }, { count: won }, { count: tasks }, { count: done }, { data: orders }, { data: events }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', org).gte('created_at', since),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'won').gte('created_at', since),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', org).gte('created_at', since),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'completed').gte('created_at', since),
    supabase.from('connected_orders').select('total_amount,channel,ordered_at').eq('organization_id', org).gte('ordered_at', since),
    supabase.from('analytics_events').select('*').eq('organization_id', org).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(100),
  ]);

  const revenue = (orders ?? []).reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);
  const conversion = leads ? Math.round(((won || 0) / leads) * 100) : 0;
  const completion = tasks ? Math.round(((done || 0) / tasks) * 100) : 0;

  const channels = new Map<string, number>();
  for (const order of orders ?? []) {
    const channel = order.channel || 'unknown';
    channels.set(channel, (channels.get(channel) || 0) + Number(order.total_amount || 0));
  }

  const metrics = [
    ['Connected revenue', `₦${revenue.toLocaleString()}`],
    ['New leads', String(leads || 0)],
    ['Lead win rate', `${conversion}%`],
    ['Task completion', `${completion}%`],
  ] as const;

  return (
    <WorkspaceShell title="Analytics" subtitle="Last 30 days" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Performance</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Analytics center</h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value], index) => (
            <div key={label} className={`rounded-[26px] border border-white/80 ${metricStyles[index][2]} p-5 shadow-sm`}>
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${metricStyles[index][0]}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">Revenue by channel</h2>
            <div className="mt-4 space-y-3">
              {[...channels.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([name, value], index) => {
                  const gradients = [
                    'from-cyan-500 to-blue-500',
                    'from-violet-500 to-fuchsia-500',
                    'from-emerald-400 to-teal-500',
                    'from-orange-400 to-rose-500',
                  ];
                  return (
                    <div key={name} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                          <strong className="capitalize text-slate-900">{name}</strong>
                        </div>
                        <b className="text-slate-950">₦{value.toLocaleString()}</b>
                      </div>
                    </div>
                  );
                })}
              {!channels.size && (
                <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-6 text-sm font-medium text-slate-500">
                  Connected orders will appear here.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">Recent signals</h2>
            <div className="mt-4 space-y-3">
              {(events ?? []).slice(0, 15).map((event: any) => (
                <div key={event.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900">{event.event_type}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(event.occurred_at).toLocaleString()}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
                    {event.source || 'WorkflowOS'}
                  </span>
                </div>
              ))}
              {!events?.length && (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-6 text-sm font-medium text-slate-500">
                  No signals yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
