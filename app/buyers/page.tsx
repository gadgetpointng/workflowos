import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import BuyerIntentQuickCreate from '@/components/BuyerIntentQuickCreate';
import BuyerIntentActions from '@/components/BuyerIntentActions';

function money(value: any) {
  return value ? `₦${Number(value).toLocaleString()}` : '—';
}

export default async function Buyers() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: intents } = await supabase
    .from('buyer_intents')
    .select('*,assignee:profiles!buyer_intents_assigned_to_fkey(full_name)')
    .eq('organization_id', profile.organization_id)
    .neq('status', 'ignored')
    .order('intent_score', { ascending: false })
    .order('observed_at', { ascending: false })
    .limit(250);

  const rows = intents ?? [];
  const enugu = rows.filter((item: any) => `${item.city || ''} ${item.state || ''}`.toLowerCase().includes('enugu')).length;
  const hot = rows.filter((item: any) => Number(item.intent_score) >= 70 && ['new', 'qualified', 'matched', 'contacting'].includes(item.status)).length;
  const opted = rows.filter((item: any) => item.consent_status === 'opted_in').length;

  const metrics = [
    ['High intent', hot, 'from-orange-400 to-rose-500'],
    ['Enugu demand', enugu, 'from-cyan-500 to-blue-500'],
    ['Contactable', opted, 'from-emerald-400 to-teal-500'],
  ] as const;

  return (
    <WorkspaceShell title="Buyer Intelligence" subtitle="Demand capture" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Demand capture</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Buyer Intelligence</h1>
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

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500" />
            <div>
              <div className="text-lg font-black text-slate-950">Capture demand</div>
              <div className="text-xs font-medium text-slate-500">Add a buyer signal</div>
            </div>
          </div>
          <BuyerIntentQuickCreate />
        </section>

        <section className="space-y-4">
          {rows.map((item: any) => {
            const matches = Array.isArray(item.matched_products) ? item.matched_products : [];
            const score = Number(item.intent_score || 0);
            const scoreGradient = score >= 70 ? 'from-orange-400 to-rose-500' : score >= 50 ? 'from-violet-500 to-fuchsia-500' : 'from-cyan-500 to-blue-500';

            return (
              <article key={item.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
                <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1fr_340px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${scoreGradient} text-xs font-black text-white`}>{Math.round(score)}</div>
                      <h2 className="text-lg font-black text-slate-950">{item.product_query}</h2>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{item.source}</span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black capitalize text-violet-700">{item.status}</span>
                    </div>

                    <div className="mt-3 text-sm text-slate-500">
                      {[item.buyer_name, item.city, item.state].filter(Boolean).join(' · ') || 'Location not supplied'} · Budget {money(item.budget_max)}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.urgency} urgency</span>
                      <span className={`rounded-full px-2.5 py-1 ${item.consent_status === 'opted_in' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {item.consent_status.replaceAll('_', ' ')}
                      </span>
                      {item.assignee?.full_name && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{item.assignee.full_name}</span>}
                    </div>

                    <div className="mt-4"><BuyerIntentActions id={item.id} leadId={item.lead_id} canContact={item.consent_status === 'opted_in'} /></div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Best matches</div>
                    <div className="mt-3 space-y-2">
                      {matches.slice(0, 3).map((match: any, index: number) => (
                        <div key={match.id || match.external_product_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-xl ${index % 2 === 0 ? 'bg-cyan-100' : 'bg-violet-100'}`} />
                            <div className="min-w-0">
                              <div className="truncate font-bold text-slate-900">{match.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{money(match.price)} · stock {Number(match.stock_quantity || 0)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!matches.length && (
                        <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-4 text-sm font-medium text-slate-500">No matching product yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!rows.length && <div className="rounded-[28px] border border-dashed border-cyan-200 bg-cyan-50/60 p-10 text-center text-sm font-medium text-slate-500">No buyer demand captured yet.</div>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
