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
  ['Automations', '/automations', '⚡', 'from-yellow-400 to-amber-500'],
  ['Analytics', '/analytics', '▥', 'from-indigo-500 to-violet-500'],
  ['AI', '/ai', '✧', 'from-fuchsia-500 via-violet-500 to-cyan-500'],
] as const;

const metricStyles = [
  'from-violet-500 to-fuchsia-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500',
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
    ['Opportunities', String(recQ.count ?? 0), '✦'],
    ['Campaigns', String(campQ.count ?? 0), '◈'],
    ['Leads', String(leadQ.count ?? 0), '◎'],
    ['Overdue', String(taskQ.count ?? 0), '!'],
  ] as const;

  const firstName = profile.full_name?.split(' ')[0] || 'there';

  return (
    <WorkspaceShell title="Dashboard" subtitle="Overview" profile={profile}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(120deg,#4f46e5_0%,#7c3aed_32%,#db2777_65%,#06b6d4_100%)] px-6 py-7 text-white shadow-xl shadow-violet-500/15 sm:px-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white/75">Welcome back</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Hi, {firstName}</h1>
            </div>
            <Link
              href="/today"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-lg transition hover:-translate-y-0.5"
            >
              Open Today →
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, icon], index) => (
            <div
              key={label}
              className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br ${metricStyles[index]} p-5 text-white shadow-lg transition hover:-translate-y-1`}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-white/80">{label}</div>
                  <div className="mt-3 text-4xl font-black">{value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-lg font-black ring-1 ring-white/20">
                  {icon}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Next moves</h2>
              <Link href="/opportunities" className="text-sm font-bold text-violet-600">
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {(topQ.data ?? []).map((item: any, index: number) => (
                <Link
                  href="/opportunities"
                  key={item.id}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:bg-white hover:shadow-md"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${metricStyles[index % metricStyles.length]} text-xs font-black text-white`}>
                    {Number(item.score).toFixed(0)}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{item.title}</div>
                  <span className="text-violet-500">→</span>
                </Link>
              ))}

              {!topQ.data?.length && (
                <div className="rounded-2xl bg-gradient-to-r from-violet-50 via-fuchsia-50 to-cyan-50 p-5 text-sm font-bold text-slate-600">
                  All caught up ✓
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl">
            <h2 className="text-lg font-black text-slate-950">Quick access</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
              {quickLinks.map(([label, href, icon, gradient]) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-sm transition group-hover:scale-105`}>
                    {icon}
                  </div>
                  <div className="mt-2.5 text-sm font-black text-slate-800">{label}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
