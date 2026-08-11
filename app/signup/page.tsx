import Link from 'next/link';
import { signup } from './actions';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-violet-600/35 blur-3xl" />
        <div className="absolute right-[-8rem] top-10 h-[30rem] w-[30rem] rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_80%_28%,rgba(34,211,238,0.08),transparent_20%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,27,75,0.94)_45%,rgba(49,46,129,0.88))]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden min-h-screen flex-col justify-between px-10 py-10 lg:flex xl:px-14 xl:py-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-xl font-black shadow-2xl shadow-violet-950/50">
              W
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">WorkflowOS</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Modern business workspace</div>
            </div>
          </Link>

          <div className="max-w-2xl py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-100 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Create your operating workspace
            </span>

            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-tight xl:text-6xl">
              Build a workspace your team
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">actually wants to use.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
              Start with one owner account, then bring in your team, workflows, campaigns, leads, marketplaces and connected business systems.
            </p>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
              {[
                ['✓', 'Team execution', 'Tasks, approvals and recurring work', 'from-violet-500 to-fuchsia-500'],
                ['✦', 'Growth intelligence', 'Leads, buyers and opportunities', 'from-fuchsia-500 to-rose-500'],
                ['↗', 'Connected systems', 'Sites, commerce and integrations', 'from-cyan-400 to-blue-500'],
                ['✧', 'Smarter decisions', 'Analytics and AI-assisted action', 'from-emerald-400 to-cyan-500'],
              ].map(([icon, title, body, gradient]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} font-black`}>{icon}</div>
                  <div className="mt-4 text-sm font-black">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Secure owner setup · invite staff after sign-in
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-lg">
            <Link href="/" className="mb-7 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-lg font-black shadow-xl">W</div>
              <div>
                <div className="font-black">WorkflowOS</div>
                <div className="text-xs text-cyan-200">Modern business workspace</div>
              </div>
            </Link>

            <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-2xl" />

              <div className="relative">
                <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">New workspace</div>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">Create your workspace</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">You’ll start as the workspace owner and can invite staff once you’re inside.</p>

                {error && (
                  <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-100">{error}</div>
                )}

                <form action={signup} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Your name</span>
                      <input
                        name="fullName"
                        required
                        minLength={2}
                        autoComplete="name"
                        placeholder="Full name"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/60 focus:bg-slate-950/50 focus:ring-4 focus:ring-violet-400/10"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Workspace</span>
                      <input
                        name="organizationName"
                        required
                        minLength={2}
                        placeholder="Business name"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-slate-950/50 focus:ring-4 focus:ring-cyan-400/10"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Email address</span>
                    <input
                      name="email"
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-slate-950/50 focus:ring-4 focus:ring-cyan-400/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Password</span>
                    <input
                      name="password"
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/60 focus:bg-slate-950/50 focus:ring-4 focus:ring-violet-400/10"
                    />
                  </label>

                  <button className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:shadow-2xl">
                    <span className="relative z-10 flex items-center justify-center gap-2">Create workspace <span className="transition group-hover:translate-x-1">→</span></span>
                  </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">WorkflowOS</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <p className="text-center text-sm text-slate-300">
                  Already have an account?{' '}
                  <Link href="/login" className="font-black text-cyan-300 transition hover:text-cyan-200">Sign in</Link>
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-slate-500">A modern workspace for focused teams and connected businesses.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
