import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import BuyerIntentQuickCreate from '@/components/BuyerIntentQuickCreate';
import BuyerIntentActions from '@/components/BuyerIntentActions';
import BuyerSourcingPanel from '@/components/BuyerSourcingPanel';

function money(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `₦${number.toLocaleString()}` : '—';
}

function normalizeSource(value: unknown) {
  const source = String(value || '').trim().toLowerCase();
  if (source.includes('facebook marketplace') || source.includes('facebook_marketplace')) return 'facebook-marketplace';
  if (source.includes('facebook') || source === 'fb' || source.includes('meta lead')) return 'facebook';
  if (source.includes('instagram') || source === 'ig') return 'instagram';
  if (source.includes('tiktok') || source.includes('tik tok')) return 'tiktok';
  if (source.includes('whatsapp') || source === 'wa') return 'whatsapp';
  if (source.includes('jiji')) return 'jiji';
  if (source.includes('jumia')) return 'jumia';
  if (source.includes('konga')) return 'konga';
  if (source.includes('google') || source.includes('maps') || source.includes('business profile')) return 'google';
  if (source.includes('website') || source.includes('web') || source.includes('gadgetpoint.ng') || source.includes('storefront')) return 'website';
  if (source.includes('phone') || source.includes('call')) return 'phone';
  if (source.includes('referr')) return 'referral';
  if (source.includes('walk') || source.includes('store') || source.includes('shop')) return 'walk-in';
  return 'other';
}

const sourceTabs = [
  ['all', 'All'],
  ['facebook', 'Facebook'],
  ['facebook-marketplace', 'FB Marketplace'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['whatsapp', 'WhatsApp'],
  ['jiji', 'Jiji'],
  ['jumia', 'Jumia'],
  ['konga', 'Konga'],
  ['google', 'Google'],
  ['website', 'Website'],
  ['phone', 'Phone'],
  ['referral', 'Referral'],
  ['walk-in', 'Walk-in'],
  ['other', 'Other'],
] as const;

function workflowStage(item: any) {
  const evidence = item.evidence && typeof item.evidence === 'object' && !Array.isArray(item.evidence) ? item.evidence : {};
  const raw = String(evidence.workflow_stage || item.status || 'new').toLowerCase();
  if (['new', 'captured'].includes(raw)) return { key: 'new', label: 'New' };
  if (raw.includes('sourcing')) return { key: 'sourcing', label: 'Sourcing' };
  if (raw.includes('quote')) return { key: 'quote', label: 'Quote' };
  if (raw.includes('payment')) return { key: 'payment', label: 'Payment' };
  if (raw.includes('deliver') || raw.includes('pickup') || raw.includes('fulfil')) return { key: 'delivery', label: 'Delivery' };
  if (raw.includes('complete') || raw.includes('closed')) return { key: 'complete', label: 'Complete' };
  if (evidence.workflow_task_id) return { key: 'searching', label: 'Searching' };
  return { key: 'searching', label: 'Searching' };
}

function matchAvailability(match: any) {
  if (match?.available === true) return { label: 'Available', tone: 'bg-emerald-50 text-emerald-700' };
  if (match?.available === false) return { label: 'Unavailable', tone: 'bg-amber-50 text-amber-700' };
  if (match?.stock_quantity !== null && match?.stock_quantity !== undefined) {
    const stock = Number(match.stock_quantity);
    if (Number.isFinite(stock)) return { label: stock > 0 ? `${stock.toLocaleString()} in stock` : 'Out of stock', tone: stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600' };
  }
  return { label: 'Unknown', tone: 'bg-slate-100 text-slate-600' };
}

export default async function Buyers({ searchParams }: { searchParams: Promise<{ source?: string; stage?: string }> }) {
  const { source = 'all', stage = 'all' } = await searchParams;
  const activeSource = sourceTabs.some(([key]) => key === source) ? source : 'all';
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [intentResult, offerResult, vendorResult] = await Promise.all([
    supabase.from('buyer_intents').select('*,assignee:profiles!buyer_intents_assigned_to_fkey(full_name)').eq('organization_id', profile.organization_id).neq('status', 'ignored').order('observed_at', { ascending: false }).limit(500),
    supabase.from('external_product_offers').select('id,title,source_price,selling_price,availability,source_url,metadata,vendor_id,vendor:vendors(name,status)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }).limit(500),
    supabase.from('vendors').select('id,name,status').eq('organization_id', profile.organization_id).order('name', { ascending: true }).limit(250),
  ]);

  const allRows = intentResult.data ?? [];
  const allOffers = offerResult.data ?? [];
  const vendors = vendorResult.data ?? [];
  const sourceRows = activeSource === 'all' ? allRows : allRows.filter((item: any) => normalizeSource(item.source) === activeSource);
  const rows = stage === 'all' ? sourceRows : sourceRows.filter((item: any) => workflowStage(item).key === stage);
  const counts = Object.fromEntries(sourceTabs.map(([key]) => [key, key === 'all' ? allRows.length : allRows.filter((item: any) => normalizeSource(item.source) === key).length])) as Record<string, number>;

  const stageCounts = ['new', 'searching', 'sourcing', 'quote', 'payment', 'delivery', 'complete'].map((key) => ({ key, count: sourceRows.filter((item: any) => workflowStage(item).key === key).length }));
  const newCount = stageCounts.find((item) => item.key === 'new')?.count ?? 0;
  const activeCount = sourceRows.filter((item: any) => !['complete'].includes(workflowStage(item).key)).length;
  const enugu = sourceRows.filter((item: any) => `${item.city || ''} ${item.state || ''}`.toLowerCase().includes('enugu')).length;

  return <WorkspaceShell title="Buyer Intelligence" subtitle="Buyer demand and next actions" profile={profile}><div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Buyer desk</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#102a43]">Buyer Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">One queue for every genuine buyer request—from social channels and marketplaces through product search, sourcing, quote, payment and delivery.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
          <div className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-2xl font-black text-[#102a43]">{newCount}</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">New buyers</div></div>
          <div className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-2xl font-black text-[#102a43]">{activeCount}</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active</div></div>
          <div className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-2xl font-black text-[#102a43]">{enugu}</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Enugu</div></div>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Buyer source</div>
      <div className="flex gap-2 overflow-x-auto pb-1">{sourceTabs.map(([key, label]) => {
        const selected = activeSource === key;
        return <Link key={key} href={key === 'all' ? '/buyers' : `/buyers?source=${key}`} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold ${selected ? 'border-[#214e78] bg-[#214e78] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label} <span className={selected ? 'text-white/70' : 'text-slate-400'}>{counts[key] || 0}</span></Link>;
      })}</div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Pipeline</div>
      <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">{stageCounts.map(({ key, count }) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const selected = stage === key;
        const href = `/buyers?${activeSource !== 'all' ? `source=${activeSource}&` : ''}stage=${key}`;
        return <Link key={key} href={href} className={`rounded-xl border px-3 py-3 ${selected ? 'border-[#214e78] bg-[#f2f7fb]' : 'border-slate-200 bg-white'}`}><div className="text-xl font-black text-[#102a43]">{count}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div></Link>;
      })}</div>
    </section>

    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-[#102a43]">+ Capture buyer manually <span className="float-right text-slate-400">⌄</span></summary>
      <div className="border-t border-slate-100 p-5 sm:p-6"><BuyerIntentQuickCreate /></div>
    </details>

    <section className="space-y-3">{rows.map((item: any) => {
      const matches = Array.isArray(item.matched_products) ? item.matched_products : [];
      const evidence = item.evidence && typeof item.evidence === 'object' && !Array.isArray(item.evidence) ? item.evidence : {};
      const sourcingOffers = allOffers.filter((offer: any) => offer.metadata?.buyer_intent_id === item.id);
      const stageInfo = workflowStage(item);
      const sourceLabel = sourceTabs.find(([key]) => key === normalizeSource(item.source))?.[1] || item.source || 'Other';
      const bestMatch = matches[0];
      const availability = bestMatch ? matchAvailability(bestMatch) : null;
      const hasInventoryMatch = matches.some((match: any) => match.available === true || Number(match.stock_quantity || 0) > 0);

      return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{sourceLabel}</span>
                <span className="rounded-full bg-[#eef4f8] px-2.5 py-1 text-[10px] font-black text-[#214e78]">{stageInfo.label}</span>
                {item.urgency && <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-500">{item.urgency}</span>}
              </div>
              <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">{item.product_query}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span><strong className="text-slate-700">Buyer:</strong> {item.buyer_name || 'Not named'}</span>
                <span><strong className="text-slate-700">Location:</strong> {[item.city, item.state].filter(Boolean).join(', ') || 'Not supplied'}</span>
                <span><strong className="text-slate-700">Budget:</strong> {money(item.budget_max)}</span>
                <span><strong className="text-slate-700">Assigned:</strong> {item.assignee?.full_name || 'Unassigned'}</span>
              </div>
            </div>

            <div className="xl:w-[330px]"><BuyerIntentActions id={item.id} leadId={item.lead_id} canContact={item.consent_status === 'opted_in'} workflowTaskId={evidence.workflow_task_id || null} workflowStage={evidence.workflow_stage || null} hasInventoryMatch={hasInventoryMatch} /></div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <details className="rounded-xl border border-slate-200 bg-slate-50/50">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-slate-700">Inventory matches {matches.length ? `(${matches.length})` : ''} <span className="float-right text-slate-400">⌄</span></summary>
              <div className="space-y-2 border-t border-slate-200 p-3">{matches.slice(0, 4).map((match: any) => {
                const matchState = matchAvailability(match);
                return <div key={match.id || match.external_product_id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3"><div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900">{match.name}</div><div className="mt-1 text-xs text-slate-500">{money(match.price)} · {match.category || 'Product'}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${matchState.tone}`}>{matchState.label}</span></div>;
              })}{!matches.length && <div className="p-3 text-sm text-slate-500">No live inventory match yet.</div>}</div>
            </details>

            <details id={`sourcing-${item.id}`} className="rounded-xl border border-slate-200 bg-slate-50/50">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-slate-700">Supplier sourcing {sourcingOffers.length ? `(${sourcingOffers.length})` : ''} <span className="float-right text-slate-400">⌄</span></summary>
              <div className="border-t border-slate-200 p-3"><BuyerSourcingPanel intentId={item.id} productQuery={item.product_query} canContact={item.consent_status === 'opted_in'} offers={sourcingOffers as any[]} vendors={vendors as any[]} quoteId={evidence.workflow_quote_id || null} /></div>
            </details>
          </div>

          {bestMatch && availability && <div className="mt-3 text-xs text-slate-500">Best current match: <strong className="text-slate-700">{bestMatch.name}</strong> · {money(bestMatch.price)} · <span className={availability.tone.includes('emerald') ? 'text-emerald-700' : 'text-slate-600'}>{availability.label}</span></div>}
        </div>
      </article>;
    })}

    {!rows.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><div className="text-base font-black text-[#102a43]">No buyers in this queue</div><div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">New requests from this source or stage will appear here automatically when captured through an approved integration or by staff.</div></div>}
    </section>
  </div></WorkspaceShell>;
}
