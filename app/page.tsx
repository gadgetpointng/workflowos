import Link from 'next/link';

const pillars = [
  {
    title: 'Execute',
    body: 'Tasks, approvals, recurring work and team execution in one focused workspace.',
    icon: '✓',
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  {
    title: 'Grow',
    body: 'Campaigns, leads, buyer intelligence and opportunities that turn signals into action.',
    icon: '✦',
    gradient: 'from-fuchsia-500 to-rose-500',
  },
  {
    title: 'Connect',
    body: 'Bring GadgetPoint, marketplaces, websites and business systems into one operating layer.',
    icon: '↗',
    gradient: 'from-cyan-400 to-blue-500',
  },
  {
    title: 'Learn',
    body: 'Use outcomes, activity and demand signals to surface the next best action for your team.',
    icon: '✧',
    gradient: 'from-emerald-400 to-cyan-500',
  },
] as const;

const metrics = [
  ['Work', 'Tasks · Approvals · SLA'],
  ['Growth', 'Leads · Campaigns · Buyers'],
  ['Commerce', 'Sites · Vendors · Marketplaces'],
  ['Intelligence', 'Analytics · AI · Recommendations'],
] as const;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 -top-40 h-[32rem] w-[32rem] rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute right-[-10rem] top-12 h-[34rem] w-[34rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_75%_25%,rgba(34,211,238,0.08),transparent_20%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,27,75,0.95)_45%,rgba(49,46,129,0.90))]" />
      </div>

      <div className="relative">
        <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10 xl:px-14">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-lg font-black shadow-xl shadow-violet-950/40">
                W
              </div>
              <div>
                <div className="font-black tracking-tight">WorkflowOS</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">Business workspace</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
              <a href="#platform" className="transition hover:text-white">Platform</a>
              <a href="#workspace" className="transition hover:text-white">Workspace</a>
              <a href="#connected" className="transition hover:text-white">Connected</a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 sm:inline-flex"
              >
                Create workspace
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid max-w-[1500px] gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-24 xl:px-14 xl:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-100 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Standalone by design · deeply integratable
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl xl:text-7xl">
              One workspace for
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                work, growth and momentum.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              WorkflowOS brings teams, campaigns, leads, marketplaces, approvals, analytics and connected business systems into one modern operating workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-5 py-3.5 text-sm font-black text-white shadow-2xl shadow-violet-950/40 transition hover:-translate-y-0.5"
              >
                Start your workspace
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/15"
              >
                Open WorkflowOS
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-2"><span className="text-emerald-400">●</span> Production ready</span>
              <span className="flex items-center gap-2"><span className="text-cyan-300">✦</span> Connected workflows</span>
              <span className="flex items-center gap-2"><span className="text-violet-300">✓</span> Secure team workspace</span>
            </div>
          </div>

          <div className="relative" id="workspace">
            <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl sm:p-5">
              <div className="rounded-[27px] border border-white/10 bg-slate-950/65 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Live workspace</div>
                    <div className="mt-1 text-xl font-black">Today at a glance</div>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300">Online</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['12', 'Tasks', 'from-violet-500 to-fuchsia-500'],
                    ['7', 'Leads', 'from-cyan-400 to-blue-500'],
                    ['4', 'Campaigns', 'from-pink-500 to-rose-500'],
                    ['3', 'Signals', 'from-emerald-400 to-teal-500'],
                  ].map(([value, label, gradient]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <div className={`inline-flex rounded-xl bg-gradient-to-br ${gradient} px-2.5 py-1.5 text-sm font-black text-white`}>{value}</div>
                      <div className="mt-3 text-xs font-bold text-slate-300">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_.9fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black">Next best actions</div>
                      <span className="text-xs font-bold text-violet-300">View all →</span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {[
                        ['92', 'Follow up high-intent buyer', 'from-violet-500 to-fuchsia-500'],
                        ['84', 'Review active campaign', 'from-cyan-400 to-blue-500'],
                        ['78', 'Resolve overdue approval', 'from-orange-400 to-rose-500'],
                      ].map(([score, title, gradient]) => (
                        <div key={title} className="flex items-center gap-3 rounded-xl bg-slate-900/80 p-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-[11px] font-black`}>{score}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-200">{title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-cyan-400/10 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">WorkflowOS Copilot</div>
                    <div className="mt-3 text-2xl font-black">✧</div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">Ask what needs attention, what changed, and what your team should do next.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 xl:px-14">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="group rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10 sm:p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${pillar.gradient} text-lg font-black text-white shadow-lg transition group-hover:scale-105`}>
                  {pillar.icon}
                </div>
                <h2 className="mt-5 text-xl font-black">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="connected" className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-10 xl:px-14">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/7 p-6 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">One operating layer</div>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Connected without becoming complicated.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">WorkflowOS keeps execution independent while connecting the systems your business already uses. GadgetPoint is the first deep integration, not the boundary.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map(([label, detail], index) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-violet-400' : index === 1 ? 'bg-fuchsia-400' : index === 2 ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
                      <div className="font-black">{label}</div>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 px-5 py-7 sm:px-8 lg:px-10 xl:px-14">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="font-bold text-slate-400">WorkflowOS</div>
            <div>Modern business execution workspace</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
