import Link from 'next/link';

const pillars = [
  ['Execute', 'Tasks · Approvals · Team', '✓', 'from-violet-500 to-fuchsia-500'],
  ['Grow', 'Leads · Buyers · Campaigns', '✦', 'from-fuchsia-500 to-rose-500'],
  ['Connect', 'Sites · Vendors · Marketplaces', '↗', 'from-cyan-400 to-blue-500'],
  ['Learn', 'Analytics · AI · Signals', '✧', 'from-emerald-400 to-cyan-500'],
] as const;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 -top-40 h-[32rem] w-[32rem] rounded-full bg-violet-600/35 blur-3xl" />
        <div className="absolute right-[-10rem] top-12 h-[34rem] w-[34rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="relative">
        <header className="border-b border-white/10 bg-slate-950/45 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1450px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-lg font-black shadow-xl shadow-violet-950/40">W</div>
              <div>
                <div className="font-black tracking-tight">WorkflowOS</div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/70">Powered by GadgetPoint</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10">Sign in</Link>
              <Link href="/signup" className="hidden rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 sm:inline-flex">Create workspace</Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid min-h-[70vh] max-w-[1450px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_.9fr] lg:items-center lg:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-cyan-100 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Business execution workspace
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl xl:text-7xl">
              Work moves.
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">Business grows.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">One colorful workspace for execution, growth and connected commerce.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-5 py-3.5 text-sm font-black shadow-2xl shadow-violet-950/40 transition hover:-translate-y-0.5">Get started →</Link>
              <Link href="/login" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3.5 text-sm font-bold backdrop-blur-xl transition hover:bg-white/15">Open workspace</Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-3xl" />
            <div className="relative rounded-[32px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Live workspace</div>
                  <div className="mt-1 text-xl font-black">Today</div>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-black text-emerald-300">Online</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['12', 'Tasks', 'from-violet-500 to-fuchsia-500'],
                  ['7', 'Leads', 'from-cyan-400 to-blue-500'],
                  ['4', 'Campaigns', 'from-pink-500 to-rose-500'],
                  ['3', 'Signals', 'from-emerald-400 to-teal-500'],
                ].map(([value, label, gradient]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${gradient} px-3 py-2 text-lg font-black`}>{value}</div>
                    <div className="mt-3 text-xs font-bold text-slate-300">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">Next best action</span>
                  <span className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-black">92</span>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-300">Follow up high-intent buyer</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1450px] px-5 pb-16 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map(([title, detail, icon, gradient]) => (
              <article key={title} className="rounded-[26px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg font-black`}>{icon}</div>
                <h2 className="mt-4 text-lg font-black">{title}</h2>
                <div className="mt-2 text-xs font-semibold text-slate-400">{detail}</div>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 px-5 py-7 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="font-black text-slate-400">WorkflowOS</div>
            <div>Powered by <span className="font-black text-cyan-300">GadgetPoint</span></div>
          </div>
        </footer>
      </div>
    </main>
  );
}
