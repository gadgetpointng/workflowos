import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

const channels = [
  { key: 'facebook', label: 'Facebook / Instagram', gradient: 'from-blue-500 to-fuchsia-500' },
  { key: 'tiktok', label: 'TikTok', gradient: 'from-slate-900 to-pink-500' },
  { key: 'whatsapp', label: 'WhatsApp', gradient: 'from-emerald-400 to-green-600' },
  { key: 'storefront', label: 'GadgetPoint Storefront', gradient: 'from-cyan-500 to-blue-500' },
  { key: 'facebook_marketplace', label: 'Facebook Marketplace', gradient: 'from-indigo-500 to-cyan-500' },
  { key: 'marketplace', label: 'Other Marketplaces', gradient: 'from-orange-400 to-rose-500' },
];

export default async function Marketing() {
  const { supabase, profile } = await requireUser();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: leads }, { data: events }, { data: integrations }] = await Promise.all([
    supabase.from('leads').select('id,source,status').eq('organization_id', profile.organization_id).gte('created_at', since),
    supabase.from('analytics_events').select('id,source,event_type,amount,created_at').eq('organization_id', profile.organization_id).gte('created_at', since),
    supabase.from('external_integrations').select('slug,name,status,kind,last_synced_at').eq('organization_id', profile.organization_id),
  ]);

  const leadCounts = new Map<string, number>();
  for (const lead of leads ?? []) {
    const source = lead.source || 'unknown';
    leadCounts.set(source, (leadCounts.get(source) || 0) + 1);
  }

  const conversionCounts = new Map<string, number>();
  for (const event of events ?? []) {
    if (['vendor_sale', 'order', 'campaign_attribution', 'acquisition_lead'].includes(event.event_type)) {
      const source = event.source || 'unknown';
      conversionCounts.set(source, (conversionCounts.get(source) || 0) + 1);
    }
  }

  const connected = new Map((integrations ?? []).map((item: any) => [item.slug, item]));

  return (
    <WorkspaceShell title="Marketing" subtitle="Acquisition channels" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-pink-600">Acquisition</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Marketing channels</h1>
          </div>
          <div className="rounded-2xl border border-pink-100 bg-pink-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-pink-700">30-day leads</div>
            <div className="text-xl font-black text-slate-950">{leads?.length ?? 0}</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => {
            const integration: any = connected.get(channel.key);
            const count = (leadCounts.get(channel.key) || 0) + (channel.key === 'facebook' ? leadCounts.get('instagram') || 0 : 0);
            const tracked = conversionCounts.get(channel.key) || 0;

            return (
              <article key={channel.key} className="overflow-hidden rounded-[26px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className={`h-1.5 bg-gradient-to-r ${channel.gradient}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${channel.gradient}`} />
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${integration?.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {integration?.status || 'ready'}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-black text-slate-950">{channel.label}</h2>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-cyan-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Leads</div>
                      <div className="mt-1 text-xl font-black text-slate-950">{count}</div>
                    </div>
                    <div className="rounded-2xl bg-violet-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Actions</div>
                      <div className="mt-1 text-xl font-black text-slate-950">{tracked}</div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-[28px] bg-slate-950 p-5 text-white shadow-xl sm:p-6">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Flow</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Acquire', 'Score', 'Match', 'Assign', 'Sell', 'Attribute'].map((step, index) => (
              <span key={step} className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-white/10 ${index % 2 === 0 ? 'bg-violet-500/20 text-violet-100' : 'bg-cyan-500/20 text-cyan-100'}`}>{step}</span>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
