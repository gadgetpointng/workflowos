import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import { buyerNextAction } from '@/lib/buyers/next-action';
import { matchProducts } from '@/lib/buyers/intelligence';

function money(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `₦${number.toLocaleString()}` : '—';
}

function liveAvailability(product: any) {
  if (!product) return { label: 'No live match', tone: 'text-slate-500 bg-slate-100' };
  if (product.available === true || product.metadata?.available === true) {
    return { label: 'Available on GadgetPoint', tone: 'text-emerald-700 bg-emerald-50' };
  }
  if (product.available === false || product.metadata?.available === false) {
    return { label: 'Unavailable on storefront', tone: 'text-amber-700 bg-amber-50' };
  }
  if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
    const stock = Number(product.stock_quantity);
    if (Number.isFinite(stock)) {
      return {
        label: stock > 0 ? `${stock.toLocaleString()} in stock` : 'No exact stock available',
        tone: stock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100',
      };
    }
  }
  return { label: 'Availability unknown', tone: 'text-slate-500 bg-slate-100' };
}

export default async function BuyerRadar() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const [{ data: demandData }, { data: catalogData }] = await Promise.all([
    supabase
      .from('buyer_intents')
      .select('id,product_query,source,city,state,urgency,consent_status,intent_score,status,lead_id,matched_products,observed_at')
      .eq('organization_id', org)
      .in('status', ['new', 'qualified', 'matched', 'contacting', 'converted'])
      .order('intent_score', { ascending: false })
      .limit(300),
    supabase
      .from('connected_products')
      .select('id,external_product_id,name,category,price,stock_quantity,active,sku,metadata,last_synced_at')
      .eq('organization_id', org)
      .eq('active', true)
      .order('last_synced_at', { ascending: false })
      .limit(500),
  ]);

  const catalog = catalogData ?? [];
  const rows = (demandData ?? [])
    .map((item: any) => ({ ...item, next: buyerNextAction(item) }))
    .sort((a: any, b: any) => b.next.priority - a.next.priority);

  const locations = new Map<string, { count: number; hot: number; score: number }>();
  for (const item of rows) {
    const key = [item.city, item.state].filter(Boolean).join(', ') || 'Location unknown';
    const value = locations.get(key) || { count: 0, hot: 0, score: 0 };
    value.count += 1;
    value.score += Number(item.intent_score || 0);
    if (Number(item.intent_score) >= 70) value.hot += 1;
    locations.set(key, value);
  }

  const rankedLocations = [...locations.entries()]
    .map(([name, value]) => ({ name, ...value, avg: Math.round(value.score / value.count) }))
    .sort((a, b) => b.hot - a.hot || b.avg - a.avg)
    .slice(0, 10);

  const demandProducts = new Map<string, number>();
  for (const item of rows) {
    const query = (item.product_query || 'Unspecified').trim();
    demandProducts.set(query, (demandProducts.get(query) || 0) + 1);
  }

  const wanted = [...demandProducts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => {
      const liveMatch = matchProducts({ product_query: name }, catalog, 1)[0] ?? null;
      return { name, count, liveMatch, availability: liveAvailability(liveMatch) };
    });

  const liveAvailable = catalog.filter(
    (product: any) => Number(product.stock_quantity || 0) > 0 || product.metadata?.available === true,
  );
  const hot = rows.filter((item: any) => Number(item.intent_score) >= 70).length;
  const contactable = rows.filter((item: any) => item.consent_status === 'opted_in').length;
  const latestCatalogSync = catalog
    .map((product: any) => product.last_synced_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  const metrics = [
    { label: 'Active demand', value: rows.length, note: 'genuine buyer signals' },
    { label: 'Hot opportunities', value: hot, note: 'intent score 70+' },
    { label: 'Live catalog', value: catalog.length, note: 'mirrored from GadgetPoint' },
    { label: 'Available now', value: liveAvailable.length, note: 'storefront availability' },
  ];

  return (
    <WorkspaceShell title="Buyer Radar" subtitle="Demand and live catalog intelligence" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Commercial intelligence</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#102a43]">Buyer Radar</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Match genuine demand against the live GadgetPoint catalog without taking ownership of store inventory.
            </p>
          </div>
          <Link href="/buyers" className="ios-action rounded-[13px] bg-[#102a43] px-4 py-3 text-sm font-bold text-white">
            Open Buyer Intelligence →
          </Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-500">{metric.label}</div>
              <div className="mt-2 text-3xl font-black tabular-nums text-[#102a43]">{metric.value}</div>
              <div className="mt-2 text-xs text-slate-500">{metric.note}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#102a43]">Live GadgetPoint sales readiness</h2>
              <p className="mt-1 text-sm text-slate-600">
                Read-only catalog mirror. GadgetPoint Admin remains the source of truth for products and inventory.
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              {latestCatalogSync ? `Synced ${new Date(latestCatalogSync).toLocaleString()}` : 'Waiting for catalog sync'}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalog.slice(0, 9).map((product: any) => {
              const availability = liveAvailability(product);
              return (
                <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{product.category || 'Uncategorised'} · {money(product.price)}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${availability.tone}`}>
                      {availability.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {!catalog.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                The live GadgetPoint catalog has not synced yet.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-[#102a43]">Demand by location</h2>
            <div className="mt-4 space-y-3">
              {rankedLocations.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-500">Average intent {item.avg}/100</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black tabular-nums text-[#102a43]">{item.count}</div>
                    <div className="text-xs font-semibold text-amber-700">{item.hot} hot</div>
                  </div>
                </div>
              ))}
              {!rankedLocations.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  No genuine location demand has been captured yet. Radar will populate as buyer signals arrive.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#102a43]">Most requested</h2>
              <span className="text-xs font-semibold text-slate-500">{contactable} contactable</span>
            </div>
            <div className="mt-4 space-y-3">
              {wanted.map((item, index) => (
                <div key={item.name} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#102a43] text-xs font-black text-white">{index + 1}</span>
                        <span className="truncate font-bold text-slate-900">{item.name}</span>
                      </div>
                      {item.liveMatch && (
                        <div className="mt-2 pl-9 text-xs text-slate-500">
                          Best live match: {item.liveMatch.name} · {money(item.liveMatch.price)}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-black tabular-nums text-[#102a43]">{item.count}</div>
                      <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${item.availability.tone}`}>
                        {item.availability.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {!wanted.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  No buyer request volume yet. Live products above are ready for matching when demand arrives.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#102a43]">Next actions</h2>
              <p className="mt-1 text-sm text-slate-500">Prioritised from real buyer intent only.</p>
            </div>
            <Link href="/leads" className="ios-action rounded-[13px] border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#214e78]">
              Sales pipeline →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {rows.slice(0, 20).map((item: any) => {
              const score = Math.round(Number(item.intent_score || 0));
              const storedMatch = Array.isArray(item.matched_products) ? item.matched_products[0] : null;
              const availability = liveAvailability(storedMatch);
              return (
                <div key={item.id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900">{item.product_query}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{item.source}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${score >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        Score {score}
                      </span>
                      {storedMatch && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${availability.tone}`}>{availability.label}</span>}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {[item.city, item.state].filter(Boolean).join(', ') || 'Location unknown'} · {item.next.reason}
                    </div>
                  </div>
                  <Link href="/buyers" className="ios-action rounded-[13px] bg-[#102a43] px-3 py-2 text-sm font-bold text-white">
                    {item.next.label} →
                  </Link>
                </div>
              );
            })}

            {!rows.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No active buyer opportunities yet. WorkflowOS will keep the live catalog ready while genuine demand is captured.
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
