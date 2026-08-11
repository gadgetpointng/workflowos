import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

const channels = [
  {
    key: 'facebook',
    label: 'Facebook / Instagram',
    note: 'Meta lead ads, social campaigns and consented enquiries',
    gradient: 'from-blue-500 to-fuchsia-500',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    note: 'Lead generation, campaign attribution and product-interest signals',
    gradient: 'from-slate-900 to-pink-500',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    note: 'Direct buyer conversations and sales follow-up',
    gradient: 'from-emerald-400 to-green-600',
  },
  {
    key: 'storefront',
    label: 'GadgetPoint Storefront',
    note: 'Search, product views, carts and customer enquiries',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    key: 'facebook_marketplace',
    label: 'Facebook Marketplace',
    note: 'Marketplace demand signals where supported',
    gradient: 'from-indigo-500 to-cyan-500',
  },
  {
    key: 'marketplace',
    label: 'Other Marketplaces',
    note: 'Jiji, Jumia, Konga and approved future connectors',
    gradient: 'from-orange-400 to-rose-500',
  },
] as const;

export default async function Marketing() {
  const { supabase, profile } = await requireUser();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: leads }, { data: events }, { data: integrations }] = await Promise.all([
    supabase
      .from('leads')
      .select('id,source,status')
      .eq('organization_id', profile.organization_id)
      .gte('created_at', since),
    supabase
      .from('analytics_events')
      .select('id,source,event_type,amount,created_at')
      .eq('organization_id', profile.organization_id)
      .gte('created_at', since),
    supabase
      .from('external_integrations')
      .select('slug,name,status,kind,last_synced_at')
      .eq('organization_id', profile.organization_id),
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
    <WorkspaceShell
      title="Marketing"
      subtitle="Acquisition channels connected to Buyer Intelligence and sales execution"
      profile={profile}
    >
      <div className="space-y-6">
        <section className="page-heading">
          <div>
            <div className="eyebrow">Acquisition command center</div>
            <h1>Marketing channels</h1>
            <p>
              Track where buyers come from, route consented enquiries into WorkflowOS, and measure which channels create real sales work.
            </p>
          </div>
          <div className="metric-chip">
            <strong>{leads?.length ?? 0}</strong>
            <span>leads · last 30 days</span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => {
            const integration: any = connected.get(channel.key);
            const count =
              (leadCounts.get(channel.key) || 0) +
              (channel.key === 'facebook' ? leadCounts.get('instagram') || 0 : 0);
            const tracked = conversionCounts.get(channel.key) || 0;
            const isConnected = integration?.status === 'connected';

            return (
              <article
                key={channel.key}
                className="app-card overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`h-1.5 bg-gradient-to-r ${channel.gradient}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${channel.gradient}`} />
                      <h2 className="mt-4 text-lg font-semibold text-slate-950">{channel.label}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{channel.note}</p>
                    </div>
                    <span className={`status-pill shrink-0 ${isConnected ? '' : 'opacity-60'}`}>
                      {integration?.status || 'ready'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-cyan-50/80 p-3">
                      <span className="text-xs font-semibold text-cyan-700">Leads</span>
                      <strong className="mt-1 block text-xl text-slate-950">{count}</strong>
                    </div>
                    <div className="rounded-2xl bg-violet-50/80 p-3">
                      <span className="text-xs font-semibold text-violet-700">Tracked actions</span>
                      <strong className="mt-1 block text-xl text-slate-950">{tracked}</strong>
                    </div>
                  </div>

                  {integration?.last_synced_at ? (
                    <div className="mt-4 text-xs text-slate-400">
                      Last synced {new Date(integration.last_synced_at).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="app-card overflow-hidden p-0">
          <div className="bg-slate-950 p-5 text-white sm:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Acquisition rule</div>
            <h2 className="mt-2 text-lg font-semibold">Signals become work only when they are actionable.</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              Meta and TikTok can send opted-in lead events into WorkflowOS. WorkflowOS scores the buyer, matches GadgetPoint inventory, assigns sales staff and tracks attribution. Public engagement or marketplace demand remains intelligence only until the person has consented to direct contact.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Acquire', 'Score', 'Match', 'Assign', 'Sell', 'Attribute'].map((step, index) => (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-white/10 ${
                    index % 2 === 0
                      ? 'bg-violet-500/20 text-violet-100'
                      : 'bg-cyan-500/20 text-cyan-100'
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
