import Link from 'next/link';
import { login } from './actions';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-600/40 blur-3xl" />
        <div className="absolute right-[-6rem] top-16 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.08),transparent_20%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,27,75,0.94)_45%,rgba(49,46,129,0.88))]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="hidden min-h-screen flex-col justify-between px-10 py-10 lg:flex xl:px-14 xl:py-12">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-xl font-black shadow-2xl shadow-violet-950/50">
              W
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">WorkflowOS</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                Modern business workspace
              </div>
            </div>
          </div>

          <div className="max-w-2xl py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-100 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Connected to GadgetPoint
            </span>

            <h1 className="mt-7 text-5xl font-black leading-[1.03] tracking-tight xl:text-6xl">
              One staff login.
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                Two connected systems.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
              Staff authenticate with the same GadgetPoint username and password already managed by the owner. WorkflowOS receives only the verified staff identity and access profile.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">1</div>
                <div className="mt-4 text-sm font-bold">GadgetPoint login</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">Use the staff username set by the owner</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 font-black">2</div>
                <div className="mt-4 text-sm font-bold">Verified identity</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">Role, branch and permissions are carried across</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 font-black">3</div>
                <div className="mt-4 text-sm font-bold">WorkflowOS</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">No second staff password is created</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Staff credentials remain controlled by GadgetPoint
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-lg font-black shadow-xl">W</div>
              <div>
                <div className="font-black">WorkflowOS</div>
                <div className="text-xs text-cyan-200">Connected to GadgetPoint</div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-2xl" />

              <div className="relative">
                <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Welcome back</div>

                <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">Continue to WorkflowOS</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">Choose the sign-in method that matches your GadgetPoint access.</p>

                {error && (
                  <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-100">{error}</div>
                )}

                {message && (
                  <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100">{message}</div>
                )}

                <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Staff access</div>
                  <h3 className="mt-1 text-lg font-black text-white">Use your GadgetPoint username</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    Staff do not need an email address for WorkflowOS. Use the normal GadgetPoint username and password created by the owner, then choose <span className="font-bold text-white">Sign in &amp; open WorkflowOS</span>.
                  </p>
                  <Link
                    href="https://gadgetpoint.ng/staff-login"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-950/30 transition hover:-translate-y-0.5"
                  >
                    Staff: Sign in with GadgetPoint <span>→</span>
                  </Link>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Owner access only</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="rounded-3xl border border-violet-300/20 bg-violet-400/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">Authorized owner identity</div>
                  <div className="mt-1 text-sm font-black text-white">{OWNER_EMAIL}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    Sign in to GadgetPoint with ChatGPT using this same email, then continue into WorkflowOS as owner.
                  </p>
                  <Link
                    href="https://gadgetpoint.ng/signin-with-chatgpt?return_to=%2Fadmin%3Fworkflowos%3D1"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-violet-950/30 transition hover:-translate-y-0.5"
                  >
                    Owner: Continue with ChatGPT <span>→</span>
                  </Link>
                </div>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Direct owner fallback</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <form action={login} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Owner email address</span>
                    <input
                      name="email"
                      required
                      readOnly
                      type="email"
                      autoComplete="email"
                      value={OWNER_EMAIL}
                      className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm font-bold text-cyan-100 outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Owner password</span>
                    <input
                      name="password"
                      required
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter owner password"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/60 focus:bg-slate-950/50 focus:ring-4 focus:ring-violet-400/10"
                    />
                  </label>

                  <button className="group relative w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-black text-white transition hover:bg-white/15">
                    <span className="relative z-10 flex items-center justify-center gap-2">Owner password sign in <span className="transition group-hover:translate-x-1">→</span></span>
                  </button>
                </form>

                <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                  No public account creation. Staff access is created and managed in GadgetPoint Admin.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
