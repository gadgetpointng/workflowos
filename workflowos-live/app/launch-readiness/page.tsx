import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { canManage, requireUser } from '@/lib/auth';
import { getLaunchChecks } from '@/lib/launch-readiness';

export const dynamic = 'force-dynamic';

export default async function LaunchReadinessPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');
  if (!canManage(profile.role)) redirect('/today');

  const { error } = await supabase.from('organizations').select('id').eq('id', profile.organization_id).limit(1);
  const checks = getLaunchChecks(!error);
  const required = checks.filter(x => x.required);
  const passed = required.filter(x => x.ok).length;
  const ready = passed === required.length;

  return <WorkspaceShell title="Launch Readiness" subtitle="Production checks for the WorkflowOS web app" profile={profile}>
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className={`rounded-3xl border p-6 ${ready ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold">{ready ? 'Core launch checks passed' : 'Launch setup is incomplete'}</h1><p className="mt-2 text-sm text-slate-600">{passed} of {required.length} required production checks are currently passing.</p></div>
          <span className={`rounded-full px-4 py-2 text-sm font-semibold ${ready ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>{ready ? 'READY' : 'SETUP REQUIRED'}</span>
        </div>
      </section>
      <section className="mt-6 grid gap-3">
        {checks.map(check => <article key={check.key} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><div className="font-semibold">{check.label}</div><div className="mt-1 text-sm text-slate-500">{check.detail}</div></div><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-400">{check.required ? 'Required' : 'Optional'}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${check.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{check.ok ? 'Pass' : 'Needs attention'}</span></div></div>
        </article>)}
      </section>
      <section className="mt-6 rounded-3xl border bg-slate-950 p-6 text-white"><h2 className="font-semibold">Architecture safety check</h2><p className="mt-2 text-sm text-slate-300">Before deployment, run <code className="rounded bg-white/10 px-2 py-1">npm run check:release</code>. It verifies the required launch structure and confirms source-owned GadgetPoint product/order mirrors are not mutated outside controlled bridge ingestion.</p></section>
    </div>
  </WorkspaceShell>;
}
