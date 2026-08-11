import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

const jobTypes = [
  ['Listing work', 'Create or update authorized product listings', 'from-violet-500 to-fuchsia-500'],
  ['Demand review', 'Turn marketplace demand into staff work', 'from-cyan-500 to-blue-500'],
  ['Sync jobs', 'Inventory, orders and performance sync', 'from-emerald-400 to-teal-500'],
] as const;

export default async function MarketplaceJobsPage() {
  const { user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  return (
    <WorkspaceShell title="Marketplace Jobs" subtitle="Channel queue" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Channel operations</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Marketplace Jobs</h1>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {jobTypes.map(([title, body, gradient]) => (
            <article key={title} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
              <div className="p-5">
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradient}`} />
                <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-dashed border-cyan-200 bg-cyan-50/60 p-6">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Connector queue</div>
          <div className="mt-2 text-sm font-medium text-slate-600">
            Jobs are queued through <code className="rounded bg-white px-2 py-1 text-slate-800">/api/marketplace-jobs</code> and execute only through approved connectors.
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
