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

export default async function IntegrationsPage() {
  const { supabase, profile } = await requireUser();

  const { data } = await supabase
    .from('external_integrations')
    .select(
      'id,name,slug,kind,status,base_url,capabilities,last_synced_at,created_at'
    )
    .order('created_at', { ascending: false });

  const integrations = data ?? [];

  return (
    <WorkspaceShell
      title="Integrations"
      subtitle="Independent systems, connected by controlled operational bridges"
      profile={profile}
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Connected systems</h1>

              <p className="mt-1 text-sm text-slate-500">
                GadgetPoint Admin remains the retail source of truth.
                WorkflowOS owns execution, CRM, campaigns, automation and
                intelligence.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Boundary-safe
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {integrations.length > 0 ? (
              integrations.map((x: any) => (
                <article
                  key={x.id}
                  className="rounded-2xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{x.name}</div>

                      <div className="text-xs text-slate-500">
                        {x.kind} · {x.slug}
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">
                      {x.status}
                    </span>
                  </div>

                  {x.base_url && (
                    <div className="mt-2 truncate text-xs text-slate-500">
                      {x.base_url}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(x.capabilities ?? []).map((cap: string) => (
                      <span
                        key={cap}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">
                No bridge configured yet. Create GadgetPoint first, then add
                other businesses or channels as needed.
              </div>
            )}
          </div>
        </section>

        <IntegrationQuickCreate />
      </div>

      <section className="mt-6 rounded-3xl border bg-slate-950 p-6 text-white">
        <h2 className="text-lg font-semibold">
          Data ownership contract
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 p-4">
            <b>GadgetPoint Admin</b>
            <p className="mt-2 text-sm text-slate-300">
              Products, stock, POS and store-order truth.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-4">
            <b>WorkflowOS</b>
            <p className="mt-2 text-sm text-slate-300">
              Tasks, staff execution, CRM, campaigns, approvals, automation
              and intelligence.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-4">
            <b>Storefront</b>
            <p className="mt-2 text-sm text-slate-300">
              Customer shopping experience and commerce entry points.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border bg-white p-6">
        <h2 className="text-lg font-semibold">
          Bridge event contract
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {eventTypes.map((x) => (
            <code
              key={x}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs"
            >
              {x}
            </code>
          ))}
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Connected systems publish events; WorkflowOS mirrors only the
          fields required for work and intelligence. This prevents two
          applications from competing to own the same business record.
        </p>
      </section>
    </WorkspaceShell>
  );
}
