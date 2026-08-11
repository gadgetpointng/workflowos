import WorkspaceShell from '@/components/WorkspaceShell';
import IntegrationQuickCreate from '@/components/IntegrationQuickCreate';
import { requireUser } from '@/lib/auth';

const eventTypes = [
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

const gradients = [
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500',
];

export default async function IntegrationsPage() {
  const { supabase, profile } = await requireUser();

  const { data } = await supabase
    .from('external_integrations')
    .select('id,name,slug,kind,status,base_url,capabilities,last_synced_at,created_at')
    .order('created_at', { ascending: false });

  const integrations = data ?? [];
  const connected = integrations.filter((item: any) => ['active', 'connected'].includes(item.status)).length;
  const gadgetpoint = integrations.find((item: any) => item.slug === 'gadgetpoint');

  return (
    <WorkspaceShell title="Integrations" subtitle="Connected systems" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Platform</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Integrations</h1>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Connected</div>
            <div className="text-xl font-black text-slate-950">{connected}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Connected systems</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Boundary safe</span>
            </div>

            <div className="mt-5 grid gap-3">
              {integrations.length > 0 ? (
                integrations.map((item: any, index: number) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <div className={`h-1 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-slate-900">{item.name}</div>
                          <div className="mt-1 text-xs font-medium text-slate-500">{item.kind} · {item.slug}</div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
                          {item.status}
                        </span>
                      </div>

                      {item.base_url && <div className="mt-3 truncate text-xs text-slate-400">{item.base_url}</div>}

                      {!!item.capabilities?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.capabilities.map((cap: string) => (
                            <span key={cap} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-6 text-sm font-medium text-slate-500">
                  No bridge configured yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <IntegrationQuickCreate gadgetpointIntegrationId={gadgetpoint?.id} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['GadgetPoint Admin', 'Retail truth', 'from-cyan-500 to-blue-500'],
            ['WorkflowOS', 'Execution + intelligence', 'from-violet-500 to-fuchsia-500'],
            ['Storefront', 'Customer commerce', 'from-emerald-400 to-teal-500'],
          ].map(([name, role, gradient]) => (
            <div key={name} className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${gradient}`} />
              <div className="mt-4 text-base font-black text-slate-950">{name}</div>
              <div className="mt-1 text-sm font-medium text-slate-500">{role}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-slate-950">Bridge events</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {eventTypes.map((event) => (
              <code key={event} className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-cyan-200">
                {event}
              </code>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
