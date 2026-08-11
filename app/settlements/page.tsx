import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function Settlements() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: settlements }, { data: orders }, { data: vendors }] = await Promise.all([
    supabase.from('vendor_settlements').select('*').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }),
    supabase.from('vendor_orders').select('*').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }).limit(100),
    supabase.from('vendors').select('id,name').eq('organization_id', profile.organization_id),
  ]);

  const vendorMap = new Map((vendors ?? []).map((vendor: any) => [vendor.id, vendor.name]));
  const gross = (orders ?? []).reduce((sum: number, order: any) => sum + Number(order.gross_amount || 0), 0);
  const commission = (orders ?? []).reduce((sum: number, order: any) => sum + Number(order.commission_amount || 0), 0);
  const owed = (orders ?? []).reduce((sum: number, order: any) => sum + Number(order.vendor_amount || 0), 0);

  const metrics = [
    ['Gross vendor sales', gross, 'from-cyan-500 to-blue-500'],
    ['WorkflowOS commission', commission, 'from-violet-500 to-fuchsia-500'],
    ['Supplier share', owed, 'from-emerald-400 to-teal-500'],
  ] as const;

  return (
    <WorkspaceShell title="Settlements" subtitle="Supplier payout control" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Commerce</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Vendor settlements</h1>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map(([label, value, gradient]) => (
            <div key={label} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${gradient}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">₦{Number(value).toLocaleString()}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-950">Settlement history</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{settlements?.length ?? 0}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(settlements ?? []).map((settlement: any, index: number) => {
              const gradients = [
                'from-emerald-400 to-teal-500',
                'from-cyan-500 to-blue-500',
                'from-violet-500 to-fuchsia-500',
                'from-orange-400 to-rose-500',
              ];
              return (
                <div key={settlement.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 md:grid-cols-[1.2fr_.8fr_.6fr_.7fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                    <strong className="text-slate-950">{vendorMap.get(settlement.vendor_id) || 'Vendor'}</strong>
                  </div>
                  <div className="font-black text-slate-950">₦{Number(settlement.amount).toLocaleString()}</div>
                  <div><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-700">{settlement.status}</span></div>
                  <div className="font-medium text-slate-500">{new Date(settlement.created_at).toLocaleDateString()}</div>
                </div>
              );
            })}

            {!settlements?.length && <div className="p-8 text-sm font-medium text-slate-500">No settlement batches yet.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
