import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const metricStyles = [
  'from-violet-500 to-fuchsia-500',
  'from-orange-400 to-rose-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-400 to-teal-500',
];

export default async function Today() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const [recs, tasks, leads, approvals, orders, signals, sites] = await Promise.all([
    supabase
      .from('growth_recommendations')
      .select('id,title,rationale,score,recommendation_type')
      .eq('organization_id', org)
      .eq('status', 'new')
      .order('score', { ascending: false })
      .limit(6),
    supabase
      .from('tasks')
      .select('id,title,status,priority,due_at')
      .eq('organization_id', org)
      .not('status', 'in', '("completed","approved","cancelled")')
      .lte('due_at', soon)
      .order('due_at', { ascending: true })
      .limit(8),
    supabase
      .from('leads')
      .select('id,name,source,product_interest,next_followup_at,status')
      .eq('organization_id', org)
      .not('status', 'in', '("purchased","lost")')
      .lte('next_followup_at', soon)
      .order('next_followup_at', { ascending: true })
      .limit(8),
    supabase
      .from('approvals')
      .select('id,entity_type,created_at,status')
      .eq('organization_id', org)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(6),
    supabase
      .from('connected_orders')
      .select('id,external_order_id,total_amount,currency,channel,status,ordered_at')
      .eq('organization_id', org)
      .order('ordered_at', { ascending: false })
      .limit(5),
    supabase
      .from('commerce_signals')
      .select('id,source,signal_type,product_ref,search_query,value,observed_at')
      .eq('organization_id', org)
      .order('observed_at', { ascending: false })
      .limit(8),
    supabase
      .from('connected_sites')
      .select('id,name,domain,status')
      .eq('organization_id', org)
      .order('created_at', { ascending: true }),
  ]);

  const overdue = (tasks.data ?? []).filter(
    (task: any) => task.due_at && new Date(task.due_at) < now
  ).length;

  const dueLeads = (leads.data ?? []).filter(
    (lead: any) => lead.next_followup_at && new Date(lead.next_followup_at) <= now
  ).length;

  const metrics = [
    ['Recommendations', recs.data?.length ?? 0, '/opportunities'],
    ['Overdue', overdue, '/tasks'],
    ['Follow-ups', dueLeads, '/leads'],
    ['Approvals', approvals.data?.length ?? 0, '/approvals'],
  ] as const;

  return (
    <WorkspaceShell title="Today" subtitle="Daily operating brief" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Today
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Your priority view
            </h1>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800">
            {sites.data?.length ?? 0} connected site{sites.data?.length === 1 ? '' : 's'}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, href], index) => (
            <Link
              href={href}
              key={label}
              className="group overflow-hidden rounded-[26px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${metricStyles[index]}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{value}</div>
              <div className="mt-3 text-xs font-bold text-slate-400 group-hover:text-violet-600">Open →</div>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Best moves</h2>
                <Link href="/opportunities" className="text-sm font-bold text-violet-600">View all →</Link>
              </div>
              <div className="mt-4 space-y-3">
                {(recs.data ?? []).slice(0, 4).map((rec: any, index: number) => (
                  <div key={rec.id} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${metricStyles[index % metricStyles.length]} text-sm font-black text-white`}>
                      {Math.round(Number(rec.score || 0))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-900">{rec.title}</div>
                      <div className="mt-1 truncate text-sm text-slate-500">
                        {rec.rationale || 'Recommended action'}
                      </div>
                    </div>
                  </div>
                ))}
                {!recs.data?.length && (
                  <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-6 text-sm font-medium text-slate-500">
                    No recommendations waiting.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Connected commerce</h2>
                <Link href="/analytics" className="text-sm font-bold text-cyan-600">Analytics →</Link>
              </div>
              <div className="mt-4 space-y-3">
                {(orders.data ?? []).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">Order {order.external_order_id}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">{order.channel || 'Connected store'} · {order.status}</div>
                    </div>
                    <div className="shrink-0 font-black text-slate-950">
                      {order.currency || 'NGN'} {Number(order.total_amount || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
                {!orders.data?.length && <div className="text-sm text-slate-500">No connected orders yet.</div>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Execution</h2>
                <Link href="/tasks" className="text-sm font-bold text-orange-600">Tasks →</Link>
              </div>
              <div className="mt-4 space-y-3">
                {(tasks.data ?? []).slice(0, 5).map((task: any) => (
                  <Link href="/tasks" key={task.id} className="block rounded-2xl border border-slate-100 p-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-bold text-slate-900">{task.title}</span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase text-orange-700">{task.priority}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {task.due_at ? `${new Date(task.due_at) < now ? 'Overdue · ' : ''}${new Date(task.due_at).toLocaleString()}` : 'No due date'}
                    </div>
                  </Link>
                ))}
                {!tasks.data?.length && <div className="text-sm text-slate-500">Nothing due soon.</div>}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Follow-ups</h2>
                <Link href="/leads" className="text-sm font-bold text-emerald-600">Leads →</Link>
              </div>
              <div className="mt-4 space-y-3">
                {(leads.data ?? []).slice(0, 4).map((lead: any) => (
                  <Link href="/leads" key={lead.id} className="block rounded-2xl bg-emerald-50/50 p-4 transition hover:bg-emerald-50">
                    <div className="font-bold text-slate-900">{lead.name || 'Unnamed lead'}</div>
                    <div className="mt-1 truncate text-sm text-slate-500">{lead.product_interest || 'General inquiry'}</div>
                  </Link>
                ))}
                {!leads.data?.length && <div className="text-sm text-slate-500">No follow-ups due.</div>}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Demand radar</h2>
                <Link href="/analytics" className="text-sm font-bold text-pink-600">Signals →</Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(signals.data ?? []).slice(0, 6).map((signal: any) => (
                  <span key={signal.id} className="rounded-full bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-800">
                    {signal.search_query || signal.product_ref || signal.signal_type}
                  </span>
                ))}
                {!signals.data?.length && <span className="text-sm text-slate-500">No signals yet.</span>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
