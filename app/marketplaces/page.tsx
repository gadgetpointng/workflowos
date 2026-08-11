import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

const platforms = [
  ['Facebook Marketplace', 'Demand + listing workflow', 'from-blue-500 to-cyan-500'],
  ['Jumia', 'Catalog + order workflow', 'from-orange-400 to-rose-500'],
  ['Jiji', 'Demand + guided listing workflow', 'from-emerald-400 to-teal-500'],
  ['Konga', 'Catalog + order workflow', 'from-violet-500 to-fuchsia-500'],
] as const;

export default async function Marketplaces() {
  const { user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  return (
    <WorkspaceShell title="Marketplaces" subtitle="Channel operations" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">Channels</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Marketplace Hub</h1>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {platforms.map(([name, mode, gradient]) => (
            <article key={name} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
              <div className="p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-black text-white`}>
                  {name.charAt(0)}
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-950">{name}</h2>
                <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{mode}</p>
                <div className="mt-5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">Connector target</div>
              </div>
            </article>
          ))}
        </section>

        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-violet-500/35 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Market intelligence</div>
            <h2 className="mt-2 text-xl font-black">Signal → action → result</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Demand', 'Score', 'Action', 'Task', 'Sale', 'Learn'].map((step, index) => (
                <span key={step} className={`rounded-full px-3 py-1.5 text-xs font-bold ${index % 2 === 0 ? 'bg-violet-500/20 text-violet-100' : 'bg-cyan-500/20 text-cyan-100'} ring-1 ring-white/10`}>
                  {step}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
