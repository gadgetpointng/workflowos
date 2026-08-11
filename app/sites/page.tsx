import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import SiteQuickCreate from '@/components/SiteQuickCreate';

export default async function Sites() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data } = await supabase
    .from('connected_sites')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  return (
    <WorkspaceShell title="Sites" subtitle="Connected businesses" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Commerce</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Connected sites</h1>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-blue-700">Sites</div>
            <div className="text-xl font-black text-slate-950">{data?.length ?? 0}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-4 md:grid-cols-2">
            {(data ?? []).map((site: any, index: number) => {
              const gradients = [
                'from-blue-500 to-cyan-500',
                'from-violet-500 to-fuchsia-500',
                'from-emerald-400 to-teal-500',
                'from-orange-400 to-rose-500',
              ];
              return (
                <article key={site.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{site.name}</div>
                        <div className="mt-1 truncate text-sm text-slate-500">{site.domain || 'No domain yet'}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">{site.status}</span>
                    </div>

                    {!!site.capabilities?.length && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {site.capabilities.map((capability: string) => (
                          <span key={capability} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">{capability}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{site.site_type}</div>
                  </div>
                </article>
              );
            })}

            {!data?.length && (
              <div className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/60 p-8 text-sm font-medium text-slate-500">
                No connected sites yet.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <SiteQuickCreate />
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
