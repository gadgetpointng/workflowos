import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const dots = [
  'bg-violet-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
];

export default async function ActivityPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data } = await supabase
    .from('activity_logs')
    .select('*,profiles:actor_id(full_name,email)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <WorkspaceShell title="Activity" subtitle="Audit trail" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Audit trail</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Organization activity</h1>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            {(data ?? []).map((item: any, index: number) => (
              <div key={item.id} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dots[index % dots.length]} shadow-sm`} />
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900">{item.action}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.profiles?.full_name || 'System'} {item.entity_type ? `· ${item.entity_type}` : ''}
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-400">{new Date(item.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}

            {!data?.length && (
              <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-6 text-sm font-medium text-slate-500">
                No activity recorded yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
