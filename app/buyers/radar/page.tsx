import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import { buyerNextAction } from '@/lib/buyers/next-action';

export default async function BuyerRadar() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const { data } = await supabase
    .from('buyer_intents')
    .select('id,product_query,source,city,state,urgency,consent_status,intent_score,status,lead_id,matched_products,observed_at')
    .eq('organization_id', org)
    .in('status', ['new', 'qualified', 'matched', 'contacting', 'converted'])
    .order('intent_score', { ascending: false })
    .limit(300);

  const rows = (data ?? [])
    .map((item: any) => ({ ...item, next: buyerNextAction(item) }))
    .sort((a: any, b: any) => b.next.priority - a.next.priority);

  const locations = new Map<string, { count: number; hot: number; score: number }>();
  for (const item of rows) {
    const key = [item.city, item.state].filter(Boolean).join(', ') || 'Location unknown';
    const value = locations.get(key) || { count: 0, hot: 0, score: 0 };
    value.count++;
    value.score += Number(item.intent_score || 0);
    if (Number(item.intent_score) >= 70) value.hot++;
    locations.set(key, value);
  }

  const ranked = [...locations.entries()]
    .map(([name, value]) => ({ name, ...value, avg: Math.round(value.score / value.count) }))
    .sort((a, b) => b.hot - a.hot || b.avg - a.avg)
    .slice(0, 12);

  const products = new Map<string, number>();
  for (const item of rows) {
    const query = (item.product_query || 'Unspecified').trim();
    products.set(query, (products.get(query) || 0) + 1);
  }

  const wanted = [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const hot = rows.filter((item: any) => Number(item.intent_score) >= 70).length;
  const contactable = rows.filter((item: any) => item.consent_status === 'opted_in').length;

  const metrics = [
    ['Active demand', rows.length, 'from-cyan-500 to-blue-500'],
    ['Hot opportunities', hot, 'from-orange-400 to-rose-500'],
    ['Ready for contact', contactable, 'from-emerald-400 to-teal-500'],
  ] as const;

  return (
    <WorkspaceShell title="Buyer Radar" subtitle="Demand command center" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Nigeria demand</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Buyer Radar</h1>
          </div>
          <Link href="/buyers" className="rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20">
            Buyer Intelligence →
          </Link>
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

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">Demand by location</h2>
            <div className="mt-4 space-y-3">
              {ranked.map((item, index) => {
                const gradients = [
                  'from-cyan-500 to-blue-500',
                  'from-violet-500 to-fuchsia-500',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-rose-500',
                ];
                return (
                  <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                      <div>
                        <div className="font-black text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">Intent {item.avg}/100</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-950">{item.count}</div>
                      <div className="text-xs font-semibold text-rose-600">{item.hot} hot</div>
                    </div>
                  </div>
                );
              })}
              {!ranked.length && <div className="text-sm text-slate-500">Location demand will appear here.</div>}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">Most requested</h2>
            <div className="mt-4 space-y-3">
              {wanted.map(([name, count], index) => (
                <div key={name} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${index % 2 === 0 ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'} text-xs font-black`}>
                      {index + 1}
                    </div>
                    <span className="truncate font-bold text-slate-900">{name}</span>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-700 shadow-sm">{count}</span>
                </div>
              ))}
              {!wanted.length && <div className="text-sm text-slate-500">Product demand will appear here.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Next actions</h2>
            <Link href="/leads" className="text-sm font-black text-emerald-600">Sales pipeline →</Link>
          </div>

          <div className="mt-4 space-y-3">
            {rows.slice(0, 20).map((item: any) => {
              const score = Math.round(Number(item.intent_score || 0));
              return (
                <div key={item.id} className="grid gap-4 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900">{item.product_query}</span>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{item.source}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${score >= 70 ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-violet-700'}`}>Score {score}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{[item.city, item.state].filter(Boolean).join(', ') || 'Location unknown'} · {item.next.reason}</div>
                  </div>
                  <Link href="/buyers" className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-black text-violet-700">
                    {item.next.label} →
                  </Link>
                </div>
              );
            })}

            {!rows.length && <div className="text-sm text-slate-500">No active buyer opportunities yet.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
