import Link from 'next/link';

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
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[1fr_.9fr]">
        <section className="hidden min-h-screen flex-col justify-between px-10 py-12 lg:flex xl:px-14">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 text-xl font-black">W</div>
            <div>
              <div className="text-xl font-black">WorkflowOS</div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/80">Connected to GadgetPoint</div>
            </div>
          </div>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> One identity system
            </div>
            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-tight xl:text-6xl">
              GadgetPoint signs you in.
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">WorkflowOS gets you to work.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
              WorkflowOS does not maintain a second owner or staff password. GadgetPoint remains the identity source and sends a verified, short-lived session into WorkflowOS.
            </p>
          </div>

          <div className="text-xs text-slate-400">GadgetPoint Admin remains the source of truth for owner, staff roles and access.</div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="rounded-[32px] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Secure access</div>
              <h2 className="mt-4 text-3xl font-black tracking-tight">Continue to WorkflowOS</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Use the same GadgetPoint identity you already have. No separate WorkflowOS password is required.</p>

              {error ? <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
              {message ? <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}

              <div className="mt-6 rounded-3xl border border-violet-300/20 bg-violet-400/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">Owner access only</div>
                <div className="mt-1 text-sm font-black text-white">{OWNER_EMAIL}</div>
                <p className="mt-2 text-xs leading-5 text-slate-300">This is the only email WorkflowOS accepts as the GadgetPoint owner identity.</p>

                <Link href="https://gadgetpoint.ng/staff-login" className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5">
                  Owner: Sign in with GadgetPoint →
                </Link>

                <Link href="https://gadgetpoint.ng/signin-with-chatgpt?return_to=%2Fadmin%3Fworkflowos%3D1" className="mt-3 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  Owner: Continue with ChatGPT →
                </Link>

                <p className="mt-3 text-[11px] leading-5 text-slate-400">ChatGPT access must resolve back to {OWNER_EMAIL}; any other owner email is rejected by WorkflowOS.</p>
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Staff</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">GadgetPoint staff access</div>
                <h3 className="mt-1 text-lg font-black">Use your normal GadgetPoint username</h3>
                <p className="mt-2 text-xs leading-5 text-slate-300">Staff can use the username and password created in GadgetPoint Admin. WorkflowOS will accept username-only staff identities without creating another password.</p>
                <Link href="https://gadgetpoint.ng/staff-login" className="mt-4 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  Staff: Sign in with GadgetPoint →
                </Link>
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">No public account creation and no separate WorkflowOS passwords.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
