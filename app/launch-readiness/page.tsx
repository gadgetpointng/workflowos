import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { canManage, requireUser } from '@/lib/auth';
import { getLaunchChecks } from '@/lib/launch-readiness';

export const dynamic = 'force-dynamic';

export default async function LaunchReadinessPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');
  if (!canManage(profile.role)) redirect('/today');

  const { error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', profile.organization_id)
    .limit(1);

  const checks = getLaunchChecks(!error);
  const required = checks.filter((check) => check.required);
  const passed = required.filter((check) => check.ok).length;
  const ready = passed === required.length;
  const percentage = required.length ? Math.round((passed / required.length) * 100) : 100;

  return (
    <WorkspaceShell title="Launch Readiness" subtitle="Production checks" profile={profile}>
      <div className="space-y-6">
        <section className={`relative overflow-hidden rounded-[30px] p-6 shadow-xl sm:p-7 ${ready ? 'bg-emerald-950 text-white' : 'bg-amber-950 text-white'}`}>
          <div className={`pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full blur-3xl ${ready ? 'bg-emerald-400/30' : 'bg-amber-400/30'}`} />
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Launch control</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                {ready ? 'Core systems ready' : 'Setup needs attention'}
              </h1>
              <div className="mt-2 text-sm text-white/70">{passed} of {required.length} required checks passing</div>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-black ring-8 ring-white/5 backdrop-blur-xl">
              {percentage}%
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          {checks.map((check, index) => (
            <article key={check.key} className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${check.ok ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-orange-400 to-rose-500'}`}>
                    {check.ok ? '✓' : '!'}
                  </div>
                  <div>
                    <div className="font-black text-slate-950">{check.label}</div>
                    <div className="mt-1 text-sm text-slate-500">{check.detail}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                    {check.required ? 'Required' : 'Optional'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {check.ok ? 'Pass' : 'Attention'}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500" />
            <div>
              <div className="font-black text-slate-950">Architecture safety</div>
              <div className="mt-1 text-sm text-slate-500">Run <code className="rounded bg-slate-100 px-2 py-1">npm run check:release</code> before release.</div>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
