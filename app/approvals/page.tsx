import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import ApprovalActions from '@/components/ApprovalActions';

export default async function Approvals() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: items } = await supabase
    .from('approvals')
    .select('*,requester:profiles!approvals_requested_by_fkey(full_name),approver:profiles!approvals_approver_id_fkey(full_name)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(100);

  const pending = (items ?? []).filter((item: any) => item.status === 'pending');

  return (
    <WorkspaceShell title="Approvals" subtitle="Review queue" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Control</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Approval queue</h1>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Pending</div>
            <div className="text-xl font-black text-slate-950">{pending.length}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-950">Requests</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{items?.length ?? 0}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(items ?? []).map((item: any) => (
              <div key={item.id} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[1.1fr_.5fr_1fr_.8fr] lg:items-center">
                <div>
                  <div className="font-black capitalize text-slate-900">{item.entity_type.replaceAll('_', ' ')}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    {item.requester?.full_name || 'System'} · {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.status === 'pending' ? 'bg-orange-50 text-orange-700' : item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status}
                  </span>
                </div>

                <div className="text-sm text-slate-500">{item.notes || 'No notes'}</div>

                <div>
                  {item.status === 'pending' && canManage(profile.role) ? (
                    <ApprovalActions id={item.id} />
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">{item.approver?.full_name || '—'}</span>
                  )}
                </div>
              </div>
            ))}

            {!items?.length && (
              <div className="p-8 text-sm font-medium text-slate-500">No approval requests.</div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
