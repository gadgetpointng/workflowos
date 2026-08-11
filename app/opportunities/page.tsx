import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import RecommendationActions from '@/components/RecommendationActions';
import WorkspaceShell from '@/components/WorkspaceShell';

const scoreGradient = (score: number) => {
  if (score >= 80) return 'from-emerald-400 to-teal-500';
  if (score >= 60) return 'from-violet-500 to-fuchsia-500';
  if (score >= 40) return 'from-cyan-500 to-blue-500';
  return 'from-orange-400 to-rose-500';
};

export default async function OpportunitiesPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: recs } = await supabase
    .from('growth_recommendations')
    .select('*,profiles:recommended_assignee(full_name,email,role)')
    .eq('organization_id', profile.organization_id)
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  const newCount = (recs ?? []).filter((rec: any) => rec.status === 'new').length;
  const highScore = (recs ?? []).filter((rec: any) => Number(rec.score || 0) >= 70).length;

  return (
    <WorkspaceShell title="Opportunities" subtitle="Growth decision center" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">Growth</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Opportunity Center</h1>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-600">New</div>
              <div className="text-xl font-black text-slate-950">{newCount}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-600">High score</div>
              <div className="text-xl font-black text-slate-950">{highScore}</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {(recs ?? []).map((rec: any) => {
            const score = Number(rec.score || 0);
            return (
              <article key={rec.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br ${scoreGradient(score)} text-base font-black text-white shadow-lg`}>
                    {score.toFixed(0)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">{rec.title}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black capitalize text-slate-600">
                        {rec.status}
                      </span>
                      {rec.recommendation_type && (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-700">
                          {String(rec.recommendation_type).replaceAll('_', ' ')}
                        </span>
                      )}
                    </div>

                    {rec.rationale && (
                      <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-6 text-slate-500">{rec.rationale}</p>
                    )}

                    <div className="mt-3 text-xs font-semibold text-slate-400">
                      {rec.profiles?.full_name ? `Suggested: ${rec.profiles.full_name}` : 'Unassigned'}
                    </div>
                  </div>

                  <div className="lg:min-w-64">
                    <RecommendationActions id={rec.id} hasTask={Boolean(rec.created_task_id)} />
                  </div>
                </div>
              </article>
            );
          })}

          {!recs?.length && (
            <div className="rounded-[28px] border border-dashed border-violet-200 bg-violet-50/60 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-xl text-white">✦</div>
              <div className="mt-3 font-black text-slate-900">No opportunities yet</div>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
