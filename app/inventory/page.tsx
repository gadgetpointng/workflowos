import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import InventoryOperationPanel from '@/components/InventoryOperationPanel';

const STALE_AFTER_MS = 30 * 60 * 1000;

export default async function InventoryPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const [{ data: products }, { data: integration }, { data: commands }] = await Promise.all([
    supabase
      .from('connected_products')
      .select('external_product_id,sku,name,category,stock_quantity,metadata,last_synced_at')
      .eq('organization_id', org)
      .eq('active', true)
      .order('name'),
    supabase
      .from('external_integrations')
      .select('id,name,status,last_synced_at')
      .eq('organization_id', org)
      .eq('slug', 'gadgetpoint')
      .neq('status', 'disabled')
      .maybeSingle(),
    supabase
      .from('integration_commands')
      .select('id,status,payload,created_at,approved_at,acknowledged_at,last_error')
      .eq('organization_id', org)
      .eq('command_type', 'inventory.adjust')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const productRows = (products ?? []) as any[];
  const commandRows = (commands ?? []) as any[];
  const pending = commandRows.filter((command) => ['pending_approval', 'approved', 'dispatched'].includes(command.status)).length;
  const failed = commandRows.filter((command) => command.status === 'failed').length;
  const branchStocks = productRows.flatMap((product) =>
    Array.isArray(product.metadata?.branches)
      ? product.metadata.branches.map((branch: any) => ({ product, branch }))
      : []
  );
  const syncTimes = productRows.map((product) => product.last_synced_at).filter(Boolean).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  const latestSyncMs = syncTimes.length ? Math.max(...syncTimes) : 0;
  const oldestSyncMs = syncTimes.length ? Math.min(...syncTimes) : 0;
  const latestSync = latestSyncMs ? new Date(latestSyncMs).toISOString() : null;
  const staleProducts = productRows.filter((product) => {
    const time = product.last_synced_at ? new Date(product.last_synced_at).getTime() : 0;
    return !time || Date.now() - time > STALE_AFTER_MS;
  }).length;
  const mirrorStale = productRows.length === 0 || staleProducts > 0 || (oldestSyncMs > 0 && Date.now() - oldestSyncMs > STALE_AFTER_MS);

  return (
    <WorkspaceShell title="Inventory" subtitle="Admin-backed stock workflow" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Store & Supply</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Inventory</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Receive, count, and report damaged stock in WorkflowOS. Approved changes are applied to GadgetPoint Admin, which remains the inventory source of truth.</p>
          </div>
          <div className={`rounded-2xl border px-4 py-2.5 ${integration && !mirrorStale ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-600">Admin connection</div>
            <div className="mt-0.5 text-sm font-black text-slate-950">{!integration ? 'Waiting for GadgetPoint Admin' : mirrorStale ? 'Connected · sync needed' : 'Connected · fresh'}</div>
          </div>
        </section>

        {mirrorStale && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">Stock freshness warning</div>
            <div className="mt-1 font-black">Do not treat this mirror as a live count until Admin syncs again.</div>
            <p className="mt-1 text-sm leading-6 text-amber-800">{productRows.length ? `${staleProducts} of ${productRows.length} mirrored products are older than 30 minutes.` : 'No Admin stock snapshot has been received yet.'} GadgetPoint Admin remains authoritative, so WorkflowOS blocks direct stock editing and only creates approval requests.</p>
          </section>
        )}

        {failed > 0 && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-950 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">Needs attention</div>
            <div className="mt-1 font-black">{failed} recent inventory request{failed === 1 ? '' : 's'} failed.</div>
            <p className="mt-1 text-sm text-rose-800">Review the failure reason below before submitting a replacement adjustment. Failed requests never silently change Admin stock.</p>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Products mirrored</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{productRows.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Branch stock rows</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{branchStocks.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Awaiting completion</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{pending}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Last Admin sync</div>
            <div className="mt-2 text-sm font-black text-slate-950">{latestSync ? new Date(latestSync).toLocaleString('en-NG') : 'Not synced yet'}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-black text-slate-950">Admin stock snapshot</h2>
              <p className="mt-1 text-xs text-slate-500">Read-only here. Changes go through the approval workflow.</p>
            </div>
            <div className="grid gap-3 border-b border-slate-100 px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:grid-cols-[1.4fr_.7fr_.7fr]">
              <span>Product</span><span>Branch</span><span>Stock</span>
            </div>
            <div className="divide-y divide-slate-100">
              {branchStocks.map(({ product, branch }: any) => (
                <div key={`${product.external_product_id}:${branch.branch_id}`} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_.7fr_.7fr] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-950">{product.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{product.sku || `Product ${product.external_product_id}`}</div>
                  </div>
                  <div className="font-bold text-slate-600">{branch.branch_name || branch.branch_id}</div>
                  <div className="font-black text-slate-950">{Number(branch.stock || 0)}</div>
                </div>
              ))}
              {!branchStocks.length && <div className="p-8 text-sm font-medium text-slate-500">Run an inventory sync from GadgetPoint Admin to load current branch stock.</div>}
            </div>
          </div>

          <InventoryOperationPanel products={productRows as any} />
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">Recent stock requests</h2>
            <p className="mt-1 text-xs text-slate-500">Pending requests require manager approval before Admin can apply them.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {commandRows.map((command) => (
              <div key={command.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1.3fr_.7fr_.7fr_1fr] md:items-center">
                <div>
                  <div className="font-black text-slate-950">{command.payload?.product_name || `Product ${command.payload?.product_id || ''}`}</div>
                  <div className="mt-1 text-xs text-slate-500">{command.payload?.branch_name || command.payload?.branch_id} · {command.payload?.reason || 'Inventory adjustment'}</div>
                </div>
                <div className="font-bold capitalize text-slate-600">{String(command.payload?.operation || 'adjust').replace('_', ' ')}</div>
                <div className={`font-black ${Number(command.payload?.delta || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(command.payload?.delta || 0) > 0 ? '+' : ''}{Number(command.payload?.delta || 0)}</div>
                <div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{String(command.status).replace('_', ' ')}</span>
                  {command.last_error && <div className="mt-1 text-xs font-semibold text-rose-700">{command.last_error}</div>}
                </div>
              </div>
            ))}
            {!commandRows.length && <div className="p-8 text-sm font-medium text-slate-500">No inventory change requests yet.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
