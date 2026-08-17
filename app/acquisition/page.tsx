import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const sources = [
  { key: 'facebook', label: 'Facebook', icon: 'f', note: 'Leads, comments and page enquiries' },
  { key: 'facebook-marketplace', label: 'Facebook Marketplace', icon: 'FM', note: 'Marketplace buyer enquiries' },
  { key: 'instagram', label: 'Instagram', icon: '◎', note: 'DMs, comments and campaign enquiries' },
  { key: 'tiktok', label: 'TikTok', icon: '♪', note: 'Video, profile and campaign enquiries' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '◉', note: 'Direct buyer conversations' },
  { key: 'jiji', label: 'Jiji', icon: 'J', note: 'Marketplace phone and accessory enquiries' },
  { key: 'jumia', label: 'Jumia', icon: 'JM', note: 'Marketplace demand and sales enquiries' },
  { key: 'konga', label: 'Konga', icon: 'K', note: 'Marketplace demand and sales enquiries' },
  { key: 'google', label: 'Google / Maps', icon: 'G', note: 'Search and Business Profile enquiries' },
  { key: 'website', label: 'GadgetPoint website', icon: '↗', note: 'Public buyer requests and storefront demand' },
  { key: 'phone', label: 'Phone calls', icon: '☎', note: 'Buyer requests captured from calls' },
  { key: 'referral', label: 'Referral', icon: '◇', note: 'Customers introduced by others' },
  { key: 'walk-in', label: 'Walk-in', icon: '⌂', note: 'In-store buyer requests' },
  { key: 'other', label: 'Other', icon: '+', note: 'Other approved acquisition channels' },
] as const;

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

export default async function AcquisitionPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');
  const { data: intents } = await supabase.from('buyer_intents').select('id,source,status,product_query,buyer_name,city,state,intent_score,observed_at').eq('organization_id', profile.organization_id).neq('status', 'ignored').order('observed_at', { ascending: false }).limit(500);
  const rows = intents ?? [];
  const counts = Object.fromEntries(sources.map((source) => [source.key, 0])) as Record<string, number>;
  for (const row of rows as any[]) counts[normalizeSource(row.source)] = (counts[normalizeSource(row.source)] || 0) + 1;
  const active = rows.filter((row: any) => !['closed', 'ignored', 'completed'].includes(String(row.status || '').toLowerCase())).length;
  const newBuyers = rows.filter((row: any) => ['new', 'captured'].includes(String(row.status || '').toLowerCase())).length;

  return <WorkspaceShell title="Buyer Acquisition" subtitle="Live buyer demand by source" profile={profile}><div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Acquisition desk</div><h1 className="mt-1 text-3xl font-black tracking-tight text-[#102a43]">Where buyers are coming from</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Each source is a live buyer queue. Open a channel to see what people need and move genuine requests into staff work, inventory search, sourcing and quotation.</p></div><div className="flex gap-2"><span className="rounded-xl bg-slate-50 px-4 py-3 text-center"><strong className="block text-2xl text-[#102a43]">{newBuyers}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">New</span></span><span className="rounded-xl bg-slate-50 px-4 py-3 text-center"><strong className="block text-2xl text-[#102a43]">{active}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active</span></span></div></div>
    </section>

    <section><div className="mb-3 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Source queues</div><h2 className="mt-1 text-xl font-black text-slate-950">Open buyer demand</h2></div><Link href="/buyers" className="text-xs font-bold text-[#214e78]">All buyers →</Link></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{sources.map((source) => <Link key={source.key} href={`/buyers?source=${encodeURIComponent(source.key)}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#b9cbd9] hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="grid h-10 min-w-10 place-items-center rounded-xl bg-slate-100 px-2 text-xs font-black text-slate-700">{source.icon}</div><div className="text-3xl font-black tabular-nums text-[#102a43]">{counts[source.key] || 0}</div></div><div className="mt-5 text-base font-black text-slate-950">{source.label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{source.note}</div><div className="mt-4 text-xs font-bold text-[#214e78]">Open queue →</div></Link>)}</div></section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-sm font-black text-[#102a43]">Connection standard</div><p className="mt-2 text-xs leading-6 text-slate-600">WorkflowOS uses official APIs, webhooks and approved business integrations where a platform provides them. Where a marketplace does not expose buyer enquiries through an authorized integration, staff capture the genuine enquiry into the same Buyer Request pipeline instead of scraping private users.</p></section>
  </div></WorkspaceShell>;
}
