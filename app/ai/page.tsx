import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AICopilot from '@/components/AICopilot';

export default async function AIPage() {
  const { user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  return (
    <WorkspaceShell title="AI Copilot" subtitle="Workspace intelligence" profile={profile}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-violet-500/40 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-cyan-400/30 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Decision intelligence</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Ask WorkflowOS</h1>
            </div>

            <div className="flex gap-2">
              <span className="rounded-full bg-violet-500/20 px-3 py-1.5 text-xs font-bold text-violet-100 ring-1 ring-violet-400/20">Growth</span>
              <span className="rounded-full bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-100 ring-1 ring-cyan-400/20">Operations</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-400/20">Sales</span>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-sm sm:p-6">
          <AICopilot />
        </section>
      </div>
    </WorkspaceShell>
  );
}
