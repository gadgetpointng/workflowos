import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const workspaces = [
  ['Today', '/today', '☀', 'from-amber-400 to-orange-500'],
  ['Buyer Radar', '/buyers/radar', '◎', 'from-cyan-400 to-blue-500'],
  ['Opportunities', '/opportunities', '✦', 'from-violet-500 to-fuchsia-500'],
  ['Tasks', '/tasks', '✓', 'from-emerald-400 to-teal-500'],
  ['Campaigns', '/campaigns', '◈', 'from-pink-500 to-rose-500'],
  ['Automations', '/automations', '⚡', 'from-yellow-400 to-amber-500'],
  ['Marketing', '/marketing', '↗', 'from-indigo-500 to-violet-500'],
  ['Leads', '/leads', '◎', 'from-sky-400 to-cyan-500'],
  ['Sites', '/sites', '◐', 'from-blue-500 to-indigo-500'],
  ['Catalog', '/catalog', '▦', 'from-orange-400 to-red-500'],
  ['Vendors', '/vendors', '♢', 'from-teal-400 to-emerald-500'],
  ['Marketplaces', '/marketplaces', '◇', 'from-purple-500 to-violet-500'],
  ['Marketplace Jobs', '/marketplace-jobs', '⇄', 'from-fuchsia-500 to-pink-500'],
  ['Integrations', '/integrations', '↗', 'from-cyan-500 to-sky-500'],
  ['Team', '/team', '♟', 'from-slate-600 to-slate-800'],
  ['AI Assistant', '/ai', '✧', 'from-violet-500 via-fuchsia-500 to-cyan-500'],
] as const;

const metricStyles = [
  {
    icon: '✦',
    gradient: 'from-violet-500 to-fuchsia-500',
    glow: 'bg-violet-400/20',
    text: 'text-violet-600',
    surface: 'from-violet-50 to-fuchsia-50/60',
  },
  {
    icon: '◈',
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'bg-cyan-400/20',
    text: 'text-cyan-700',
    surface: 'from-cyan-50 to-blue-50/60',
  },
  {
    icon: '◎',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'bg-emerald-400/20',
    text: 'text-emerald-700',
    surface: 'from-emerald-50 to-teal-50/60',
  },
  {
    icon: '!',
    gradient: 'from-orange-400 to-rose-500',
    glow: 'bg-orange-400/20',
    text: 'text-orange-700',
    surface: 'from-orange-50 to-rose-50/60',
  },
] as const;

export default async function Dashboard() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;

  const [recQ, campQ, leadQ, taskQ, topQ] = await Promise.all([
    supabase
      .from('growth_recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .eq('status', 'new'),
    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .eq('status', 'active'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .in('status', ['new', 'contacted', 'interested', 'negotiating']),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .lt('due_at', new Date().toISOString())
      .not('status', 'in', '("completed","approved","cancelled")'),
    supabase
      .from('growth_recommendations')
      .select('id,title,rationale,score,status')
      .eq('organization_id', org)
      .eq('status', 'new')
      .order('score', { ascending: false })
      .limit(4),
  ]);

  const cards = [
    ['Growth opportunities', String(recQ.count ?? 0), 'Needs review'],
    ['Active campaigns', String(campQ.count ?? 0), 'Running now'],
    ['Open leads', String(leadQ.count ?? 0), 'Sales pipeline'],
    ['Overdue tasks', String(taskQ.count ?? 0), 'Review today'],
  ] as const;

  const firstName = profile.full_name?.split(' ')[0] || 'there';

  return (
    <WorkspaceShell
      title="Dashboard"
      subtitle="Your colorful command center for growth and execution"
      profile={profile}
    >
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 px-6 py-7 text-white shadow-2xl shadow-violet-900/10 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-500/40 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur-xl">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  WorkflowOS is online
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                  GadgetPoint bridge ready
                </span>
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Your workspace
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Good to see you, {firstName}.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                See what needs attention, spot growth opportunities, and move work forward from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/today"
                className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5"
              >
                ☀ Open today
              </Link>
              <Link
                href="/ai"
                className="rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-950/30 transition hover:-translate-y-0.5"
              >
                ✧ Ask Copilot
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, value, note], index) => {
            const style = metricStyles[index];
            return (
              <div
                key={title}
                className={`group relative overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br ${style.surface} p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${style.glow} blur-2xl`} />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-600">{title}</div>
                    <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</div>
                    <div className={`mt-2 text-xs font-bold ${style.text}`}>{note}</div>
                  </div>
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${style.gradient} text-lg font-black text-white shadow-lg`}>
                    {style.icon}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                  Recommended next moves
                </div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  What should we do today?
                </h2>
              </div>
              <Link
                href="/opportunities"
                className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
              >
                View all →
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {(topQ.data ?? []).map((item: any, index: number) => {
                const recommendationGradients = [
                  'from-violet-500 to-fuchsia-500',
                  'from-cyan-500 to-blue-500',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-rose-500',
                ];
                return (
                  <div
                    key={item.id}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-violet-200 hover:bg-white hover:shadow-md"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${recommendationGradients[index % recommendationGradients.length]} text-sm font-black text-white shadow-lg`}>
                      {Number(item.score).toFixed(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="mt-1 truncate text-sm text-slate-500">
                        {item.rationale || 'Recommended action available'}
                      </div>
                    </div>
                    <span className="hidden text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500 sm:block">
                      →
                    </span>
                  </div>
                );
              })}

              {!topQ.data?.length && (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-7 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-xl text-white">
                    ✦
                  </div>
                  <div className="mt-3 font-bold text-slate-900">You are all caught up.</div>
                  <div className="mt-1 text-sm text-slate-500">New recommendations will appear here as WorkflowOS learns from activity.</div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl sm:p-6">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                Quick launch
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Open a workspace
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {workspaces.slice(0, 8).map(([label, href, icon, gradient]) => (
                <Link
                  href={href}
                  key={href}
                  className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-sm transition group-hover:scale-105`}>
                    {icon}
                  </span>
                  <div className="mt-3 text-sm font-bold leading-tight text-slate-800">{label}</div>
                </Link>
              ))}
            </div>

            <Link
              href="/my-work"
              className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <span>See all my work</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                Everything connected
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Explore WorkflowOS
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-500">
              Jump into any operating area without losing the context of your workspace.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {workspaces.slice(8).map(([label, href, icon, gradient]) => (
              <Link
                href={href}
                key={href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-sm`}>
                  {icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{label}</span>
                <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
