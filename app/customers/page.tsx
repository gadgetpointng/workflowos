import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function Customers() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', org)
    .order('total_spend', { ascending: false })
    .limit(300);

  const ids = (customers ?? []).map((customer: any) => customer.id);
  let recentOrders: any[] = [];
  if (ids.length) {
    const result = await supabase
      .from('connected_orders')
      .select('id,customer_id,channel,total_amount,currency,status,ordered_at')
      .in('customer_id', ids)
      .order('ordered_at', { ascending: false })
      .limit(500);
    recentOrders = result.data ?? [];
  }

  const orderMap = new Map<string, any[]>();
  for (const order of recentOrders) {
    const list = orderMap.get(order.customer_id) || [];
    list.push(order);
    orderMap.set(order.customer_id, list);
  }

  const spend = (customers ?? []).reduce((sum: number, customer: any) => sum + Number(customer.total_spend || 0), 0);
  const repeat = (customers ?? []).filter((customer: any) => ['repeat', 'vip'].includes(customer.lifecycle)).length;

  const metrics = [
    ['Customers', customers?.length ?? 0, 'from-cyan-500 to-blue-500'],
    ['Repeat / VIP', repeat, 'from-violet-500 to-fuchsia-500'],
    ['Tracked spend', `₦${spend.toLocaleString()}`, 'from-emerald-400 to-teal-500'],
    ['Linked orders', recentOrders.length, 'from-orange-400 to-rose-500'],
  ] as const;

  return (
    <WorkspaceShell title="Customers" subtitle="Customer 360" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Customer 360</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Customers</h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, gradient]) => (
            <div key={label} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${gradient}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(customers ?? []).map((customer: any, index: number) => {
            const orders = orderMap.get(customer.id) || [];
            const gradients = [
              'from-cyan-500 to-blue-500',
              'from-violet-500 to-fuchsia-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
              'from-pink-500 to-purple-500',
            ];
            const initials = (customer.name || customer.phone || customer.email || 'C')
              .split(' ')
              .map((part: string) => part.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <article key={customer.id} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} text-sm font-black text-white`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-black text-slate-950">{customer.name || customer.phone || customer.email || 'Unnamed customer'}</h2>
                      <div className="mt-1 truncate text-xs text-slate-500">{customer.phone || customer.email || 'No contact details'}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase text-violet-700">{customer.lifecycle}</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-cyan-50/70 p-3">
                    <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Orders</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{customer.total_orders}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/70 p-3">
                    <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Spend</div>
                    <div className="mt-1 text-lg font-black text-slate-950">₦{Number(customer.total_spend || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                  <span>{customer.primary_source || 'unknown source'}</span>
                  <span>{customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString() : 'No order'}</span>
                </div>

                {orders[0] && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-3 py-2.5 text-xs text-white">
                    <span className="font-semibold capitalize text-cyan-200">{orders[0].channel || 'store'}</span>
                    <strong>{orders[0].currency || 'NGN'} {Number(orders[0].total_amount || 0).toLocaleString()}</strong>
                  </div>
                )}
              </article>
            );
          })}

          {!customers?.length && (
            <div className="rounded-[28px] border border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-sm font-medium text-slate-500">Customer records will appear as connected channels send activity.</div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
