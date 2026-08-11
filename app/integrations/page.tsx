import WorkspaceShell from '@/components/WorkspaceShell';
import IntegrationQuickCreate from '@/components/IntegrationQuickCreate';
import { requireUser } from '@/lib/auth';

const eventTypes = [
  'site.heartbeat',
  'staff.upsert',
  'product.upsert',
  'inventory.updated',
  'order.created',
  'order.updated',
  'storefront.search',
  'product.view',
  'cart.added',
  'marketplace.demand',
  'whatsapp.inquiry',
  'meta.lead',
  'tiktok.lead',
  'social.engagement',
  'campaign.attribution',
];

function formatDate(value?: string | null) {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced yet';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function IntegrationsPage() {
  const { supabase, profile } = await requireUser();

  const { data } = await supabase
    .from('external_integrations')
    .select('id,name,slug,kind,status,base_url,capabilities,last_synced_at,created_at')
    .order('created_at', { ascending: false });

  const integrations = data ?? [];
  const connected = integrations.filter((item: any) => ['active', 'connected'].includes(item.status)).length;
  const gadgetpoint = integrations.find((item: any) => item.slug === 'gadgetpoint');

  const [{ data: sites }, productCountResult] = await Promise.all([
    supabase
      .from('connected_sites')
      .select('id,name,slug,site_type,domain,status,capabilities,metadata,updated_at')
      .eq('organization_id', profile.organization_id)
      .order('updated_at', { ascending: false }),
    gadgetpoint?.id
      ? supabase
          .from('connected_products')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('integration_id', gadgetpoint.id)
          .contains('metadata', { mirror_source: 'gadgetpoint_live_storefront' })
      : Promise.resolve({ count: 0 }),
  ]);

  const connectedSites = sites ?? [];
  const liveStore = connectedSites.find((site: any) => site.slug === 'gadgetpoint-live-storefront');
  const mirroredProducts = productCountResult.count ?? 0;
  const liveStoreMetadata = (liveStore?.metadata ?? {}) as Record<string, any>;
  const lastCatalogSync = liveStoreMetadata.catalog_synced_at ?? liveStore?.updated_at ?? null;

  return (
    <WorkspaceShell title="Integrations" subtitle="Connected systems" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#214e78]">Integration control</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#102a43]">Connected systems</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              WorkflowOS receives approved operational signals while GadgetPoint keeps ownership of store administration, products, inventory and orders.
            </p>
          </div>

          <div className="min-w-[132px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Connected</div>
            <div className="mt-1 text-2xl font-black tabular-nums text-[#102a43]">{connected}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-[#102a43]">GadgetPoint Live Storefront</h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${liveStore?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {liveStore?.status === 'active' ? 'Active' : 'Awaiting sync'}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Production storefront mirror · {liveStore?.domain ?? 'gadgetpoint.ng'}
              </p>
            </div>

            <a
              href="https://gadgetpoint.ng"
              target="_blank"
              rel="noreferrer"
              className="ios-action inline-flex min-h-[42px] items-center justify-center rounded-[13px] bg-[#102a43] px-4 text-sm font-bold text-white shadow-sm transition active:scale-[.97]"
            >
              Open live store
            </a>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Connection', liveStore?.status === 'active' ? 'Connected' : 'Pending', 'Secure read-only mirror'],
              ['Catalog items', String(mirroredProducts), 'Production products mirrored'],
              ['Last catalog sync', formatDate(lastCatalogSync), 'Automatic 30-minute refresh'],
              ['Ownership mode', 'Read only', 'GadgetPoint remains source of truth'],
            ].map(([label, value, note]) => (
              <div key={label} className="bg-white p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
                <div className="mt-2 text-lg font-black tabular-nums text-[#102a43]">{value}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{note}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Platform</div>
              <div className="mt-2 font-black text-slate-900">{liveStoreMetadata.platform ?? 'ChatGPT-hosted storefront'}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Catalog endpoint: {liveStoreMetadata.catalog_endpoint ?? '/api/store'}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Boundary protection</div>
              <div className="mt-2 font-black text-slate-900">No duplicate store admin</div>
              <div className="mt-1 text-xs font-medium text-slate-600">WorkflowOS uses mirrored data for execution and intelligence only.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#102a43]">Integration register</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Boundary safe</span>
            </div>

            <div className="mt-5 grid gap-3">
              {integrations.length > 0 ? (
                integrations.map((item: any) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs font-medium text-slate-500">{item.kind} · {item.slug}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${['active', 'connected'].includes(item.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </div>

                    {item.base_url && <div className="mt-3 truncate text-xs text-slate-400">{item.base_url}</div>}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!!item.capabilities?.length && item.capabilities.map((cap: string) => (
                        <span key={cap} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-[#214e78]">
                          {cap}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] font-semibold text-slate-400">
                        {item.last_synced_at ? `Last sync ${formatDate(item.last_synced_at)}` : 'No sync recorded'}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-500">
                  No bridge configured yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <IntegrationQuickCreate gadgetpointIntegrationId={gadgetpoint?.id} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['GadgetPoint Admin', 'Retail truth', 'Store operations, product truth, inventory and orders'],
            ['WorkflowOS', 'Execution + intelligence', 'Tasks, CRM, recommendations, communications and automation'],
            ['Storefront', 'Customer commerce', 'Shopping experience and public product availability'],
          ].map(([name, role, description]) => (
            <div key={name} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#102a43] text-sm font-black text-white">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="mt-4 text-base font-black text-[#102a43]">{name}</div>
              <div className="mt-1 text-sm font-bold text-[#214e78]">{role}</div>
              <div className="mt-2 text-xs font-medium leading-5 text-slate-500">{description}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#102a43]">Bridge event contract</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Approved operational messages WorkflowOS understands.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Controlled interface</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {eventTypes.map((event) => (
              <code key={event} className="rounded-full bg-[#102a43] px-3 py-1.5 text-[11px] font-semibold text-slate-100">
                {event}
              </code>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
