import Link from 'next/link';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const STAFF_GADGETPOINT_URL = 'https://gadgetpoint.ng/staff-login';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#172b3a]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.02fr_.98fr]">
        <section className="hidden min-h-screen flex-col justify-between bg-[#102a43] px-10 py-10 text-white lg:flex xl:px-14 xl:py-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base font-black shadow-sm">W</div>
            <div>
              <div className="text-lg font-black tracking-tight">WorkflowOS</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/80">GadgetPoint work operating system</div>
            </div>
          </div>

          <div className="max-w-2xl py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Direct staff access available
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.04] tracking-[-0.04em] xl:text-6xl">Clock in. Open your workspace. Get to work.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">Staff can sign in directly with the username and password created by the GadgetPoint owner. WorkflowOS keeps the work session separate and secure.</p>
          </div>

          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Fast staff sign-in</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-300" /> Owner-managed access</div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
          <div className="w-full max-w-lg">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Staff operations</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#102a43]">Clock in and get to work.</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Enter the exact username and password the GadgetPoint owner assigned to you.</p>

              {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">{error}</div>}
              {message && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">{message}</div>}

              <form action="/api/auth/staff-login" method="post" className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Username</span>
                  <input name="username" required autoCapitalize="none" autoCorrect="off" autoComplete="username" className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base outline-none focus:border-blue-500" placeholder="Staff username" />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Password</span>
                  <input name="password" type="password" required autoComplete="current-password" className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base outline-none focus:border-blue-500" placeholder="Staff password" />
                </label>
                <button type="submit" className="min-h-[50px] w-full rounded-xl bg-[#102a43] px-4 text-sm font-black text-white shadow-sm">Sign in &amp; open WorkflowOS</button>
              </form>

              <div className="mt-4 text-center text-xs leading-5 text-slate-500">
                Existing GadgetPoint connected login is still available as a secondary route.{' '}
                <Link href={STAFF_GADGETPOINT_URL} className="font-black text-[#214e78] underline underline-offset-2">Open GadgetPoint staff login</Link>
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Owner only</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#52718e]">Authorized owner identity</div>
                <div className="mt-1 break-all text-sm font-black text-[#102a43]">{OWNER_EMAIL}</div>
                <p className="mt-2 text-xs leading-5 text-slate-600">Use your WorkflowOS owner password to manage staff access without waiting for the old GadgetPoint Admin bridge.</p>
                <form action="/api/auth/owner-login" method="post" className="mt-4 space-y-3">
                  <input type="hidden" name="return_to" value="/staff-access" />
                  <input name="password" type="password" required autoComplete="current-password" className="min-h-[46px] w-full rounded-xl border border-blue-200 bg-white px-3.5 text-sm outline-none focus:border-blue-500" placeholder="Owner password" />
                  <button type="submit" className="min-h-[46px] w-full rounded-xl border border-[#b9cce0] bg-white px-4 text-sm font-black text-[#214e78]">Owner: manage staff access</button>
                </form>
              </section>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500">
              <Link href="https://gadgetpoint.ng" className="font-semibold hover:text-slate-700">← Return to GadgetPoint storefront</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
