import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const metricStyles = [
  'from-emerald-400 to-teal-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-fuchsia-500',
  'from-orange-400 to-rose-500',
];

export default async function Reports() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ count: tasks }, { count: done }, { count: leads }, { count: wins }, { data: orders }, { data: campaigns }] = await Promise.all([
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).gte('created_at', since),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).in('status', ['approved', 'completed']).gte('updated_at', since),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).gte('created_at', since),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).in('status', ['purchased', 'repeat_customer']).gte('updated_at', since),
    supabase.from('connected_orders').select('total,currency,status,created_at').eq('organization_id', profile.organization_id).gte('created_at', since),
    supabase.from('campaigns').select('id,name,status,budget,created_at').eq('organization_id', profile.organization_id).gte('created_at', since).order('created_at', { ascending: false }).limit(10),
  ]);

  const revenue = (orders ?? [])
    .filter((order: any) => !['cancelled', 'refunded'].includes(order.status))
    .reduce((total: number, order: any) => total + Number(order.total || 0), 0);

  const conversion = leads ? Math.round(((wins || 0) / (leads || 1)) * 100) : 0;
  const completion = tasks ? Math.round(((done || 0) / (tasks || 1)) * 100) : 0;

  const metrics = [
    ['Connected revenue', `₦${revenue.toLocaleString()}`],
    ['Task completion', `${completion}%`],
    ['Lead conversion', `${conversion}%`],
    ['Campaigns', String(campaigns?.length || 0)],
  ] as const;

  return (
    <WorkspaceShell title="Reports" subtitle="30-day operating summary" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Management reporting</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Operating report</h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value], index) => (
            <div key={label} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${metricStyles[index]}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-950">Recent campaigns</h2>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">30 days</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(campaigns ?? []).map((campaign: any, index: number) => (
              <div key={campaign.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 md:grid-cols-[1.4fr_.7fr_.8fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${metricStyles[index % metricStyles.length]}`} />
                  <div>
                    <div className="font-black text-slate-950">{campaign.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(campaign.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black capitalize text-cyan-700">{campaign.status}</span></div>
                <div className="font-bold text-slate-700">{campaign.budget ? `₦${Number(campaign.budget).toLocaleString()}` : 'No budget'}</div>
              </div>
            ))}

            {!campaigns?.length && <div className="p-8 text-sm font-medium text-slate-500">No recent campaigns.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
