import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import RecommendationActions from '@/components/RecommendationActions';
import WorkspaceShell from '@/components/WorkspaceShell';

function scoreStyle(score: number) {
  if (score >= 80) return 'border-[#c5e2d3] bg-[#edf7f2] text-[#157347]';
  if (score >= 60) return 'border-[#cbd8e3] bg-[#edf3f8] text-[#315e82]';
  if (score >= 40) return 'border-[#d7e0e8] bg-[#f1f5f8] text-[#52738f]';
  return 'border-[#ead9a9] bg-[#fff5dc] text-[#946200]';
}

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
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5eb] pb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#52738f]">Growth & sales</div>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-[#172b3a]">Opportunity Center</h1>
            <p className="mt-2 text-sm text-[#687988]">Prioritized commercial actions ranked by business value.</p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-xl border border-[#cbd8e3] bg-[#edf3f8] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#52738f]">New</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{newCount}</div>
            </div>
            <div className="rounded-xl border border-[#c5e2d3] bg-[#edf7f2] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#157347]">High score</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{highScore}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {(recs ?? []).map((rec: any) => {
            const score = Number(rec.score || 0);
            return (
              <article key={rec.id} className="overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white shadow-sm transition hover:border-[#c7d1da]">
                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl border text-base font-bold tabular-nums ${scoreStyle(score)}`}>{score.toFixed(0)}</div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[#263b4c]">{rec.title}</h2>
                      <span className="rounded-full border border-[#d7e0e8] bg-[#f2f6f9] px-2.5 py-1 text-[9px] font-bold capitalize text-[#53697c]">{rec.status}</span>
                      {rec.recommendation_type && <span className="rounded-full border border-[#cbd8e3] bg-[#edf3f8] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.05em] text-[#315e82]">{String(rec.recommendation_type).replaceAll('_', ' ')}</span>}
                    </div>

                    {rec.rationale && <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-6 text-[#687988]">{rec.rationale}</p>}

                    <div className="mt-3 text-xs font-medium text-[#8492a0]">{rec.profiles?.full_name ? `Suggested owner: ${rec.profiles.full_name}` : 'Unassigned'}</div>
                  </div>

                  <div className="lg:min-w-64"><RecommendationActions id={rec.id} hasTask={Boolean(rec.created_task_id)} /></div>
                </div>
              </article>
            );
          })}

          {!recs?.length && (
            <div className="rounded-[16px] border border-dashed border-[#ccd5de] bg-white p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#cbd8e3] bg-[#edf3f8] text-xl text-[#315e82]">✦</div>
              <div className="mt-3 font-bold text-[#32485b]">No opportunities yet</div>
              <p className="mt-1 text-sm text-[#8492a0]">New recommendations will appear here when WorkflowOS identifies them.</p>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
