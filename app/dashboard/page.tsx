import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const quickLinks = [
  ['Today', '/today', '☀', 'from-amber-400 to-orange-500'],
  ['Tasks', '/tasks', '✓', 'from-emerald-400 to-teal-500'],
  ['Opportunities', '/opportunities', '✦', 'from-violet-500 to-fuchsia-500'],
  ['Leads', '/leads', '◎', 'from-cyan-400 to-blue-500'],
  ['Campaigns', '/campaigns', '◈', 'from-pink-500 to-rose-500'],
  ['Integrations', '/integrations', '↗', 'from-indigo-500 to-violet-500'],
  ['Team', '/team', '♟', 'from-slate-600 to-slate-800'],
  ['AI', '/ai', '✧', 'from-violet-500 via-fuchsia-500 to-cyan-500'],
] as const;

const metricStyles = [
  ['✦', 'from-violet-500 to-fuchsia-500', 'from-violet-50 to-fuchsia-50'],
  ['◈', 'from-cyan-500 to-blue-500', 'from-cyan-50 to-blue-50'],
  ['◎', 'from-emerald-400 to-teal-500', 'from-emerald-50 to-teal-50'],
  ['!', 'from-orange-400 to-rose-500', 'from-orange-50 to-rose-50'],
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
      .select('id,title,score')
      .eq('organization_id', org)
      .eq('status', 'new')
      .order('score', { ascending: false })
      .limit(4),
  ]);

  const cards = [
    ['Opportunities', String(recQ.count ?? 0)],
    ['Campaigns', String(campQ.count ?? 0)],
    ['Open leads', String(leadQ.count ?? 0)],
    ['Overdue', String(taskQ.count ?? 0)],
  ] as const;

  const firstName = profile.full_name?.split(' ')[0] || 'there';

  return (
    <WorkspaceShell title="Dashboard" profile={profile}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-violet-500/40 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/25 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">WorkflowOS</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Hi, {firstName}.</h1>
            </div>

            <div className="flex gap-2">
              <Link href="/today" className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950">
                Today
              </Link>
              <Link href="/ai" className="rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white">
                ✧ AI
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, value], index) => {
            const [icon, gradient, surface] = metricStyles[index];
            return (
              <div key={title} className={`rounded-[26px] border border-white/80 bg-gradient-to-br ${surface} p-5 shadow-sm`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-600">{title}</div>
                    <div className="mt-2 text-4xl font-black text-slate-950">{value}</div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} font-black text-white shadow-md`}>
                    {icon}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-950">Next moves</h2>
              <Link href="/opportunities" className="text-sm font-bold text-violet-700">View all →</Link>
            </div>

            <div className="mt-4 space-y-3">
              {(topQ.data ?? []).map((item: any, index: number) => (
                <Link
                  key={item.id}
                  href="/opportunities"
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:bg-white hover:shadow-sm"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${metricStyles[index % metricStyles.length][1]} text-xs font-black text-white`}>
                    {Number(item.score).toFixed(0)}
                  </div>
                  <div className="min-w-0 flex-1 truncate font-bold text-slate-900">{item.title}</div>
                  <span className="text-slate-400">→</span>
                </Link>
              ))}

              {!topQ.data?.length && (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-5 text-sm font-semibold text-slate-600">
                  No new recommendations.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-950">Quick access</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickLinks.map(([label, href, icon, gradient]) => (
                <Link
                  href={href}
                  key={href}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-white hover:shadow-sm"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-black text-white`}>
                    {icon}
                  </span>
                  <span className="truncate text-sm font-bold text-slate-800">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
