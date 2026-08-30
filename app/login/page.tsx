import Link from 'next/link';
import KineticGrid from '../../components/kinetic-grid';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const STAFF_LOGIN_URL = 'https://gadgetpoint.ng/staff-login';
const OWNER_GADGETPOINT_URL = 'https://gadgetpoint.ng/admin?workflowos=1';
const OWNER_CHATGPT_URL = 'https://gadgetpoint.ng/api/workflowos/owner-login';
const OWNER_PASSWORD_ENDPOINT = 'https://gadgetpoint.ng/api/workflowos/password-login';
const TEMP_AUTH_ERROR = 'Authentication is temporarily unavailable.';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const visibleError = error === TEMP_AUTH_ERROR && authConfigured ? undefined : error;

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#172b3a]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.02fr_.98fr]">
        <section className="relative hidden min-h-screen overflow-hidden px-10 py-10 text-white lg:block xl:px-14 xl:py-12">
          <KineticGrid background="#102a43" dotColor="#ffffff" lineColor="#80acff" trailColor="#2664eb" spacing={30} radius={400} strength={4} trail />
          <div className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-col justify-between pointer-events-none xl:min-h-[calc(100vh-6rem)]">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base font-black shadow-sm backdrop-blur-sm">W</div><div><div className="text-lg font-black tracking-tight">WorkflowOS</div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/80">GadgetPoint work operating system</div></div></div>
            <div className="max-w-2xl py-10"><div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-[#102a43]/70 px-3 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur-sm"><span className="h-2 w-2 rounded-full bg-emerald-400" />Identity connected to GadgetPoint</div><h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.04] tracking-[-0.04em] xl:text-6xl">One business identity. Two connected systems.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">GadgetPoint authenticates the people. WorkflowOS receives a verified identity and runs the work around the store. Passwords remain under GadgetPoint control.</p></div>
            <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Admin and staff credentials stay in GadgetPoint</div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-300" /> WorkflowOS has no public account creation</div></div>
          </div>
        </section>
        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-7 sm:py-9 lg:px-10"><div className="w-full max-w-lg"><div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Secure access</div><h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#102a43]">Continue to WorkflowOS</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">Use your GadgetPoint credentials. WorkflowOS never stores a second password.</p>
          {visibleError && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">{visibleError}</div>}{message && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">{message}</div>}

          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#52718e]">Owner / Admin</div>
            <h3 className="mt-1 text-lg font-black text-[#102a43]">Admin username & password</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">Enter the same Admin login created in GadgetPoint. These fields submit directly to GadgetPoint for verification; WorkflowOS does not receive or store the password.</p>
            <form action={OWNER_PASSWORD_ENDPOINT} method="post" className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                <span>Admin username</span>
                <input name="username" type="text" autoComplete="username" required minLength={3} maxLength={80} autoCapitalize="none" spellCheck={false} placeholder="admin" className="min-h-[46px] rounded-[12px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                <span>Admin password</span>
                <input name="password" type="password" autoComplete="current-password" required minLength={4} maxLength={128} placeholder="Enter your GadgetPoint Admin password" className="min-h-[46px] rounded-[12px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>
              <button type="submit" className="ios-action primary-button flex min-h-[46px] w-full items-center justify-center rounded-[14px] px-4 text-sm font-black">Sign in with Admin password</button>
            </form>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-white/70 px-3 py-2.5 text-[11px] leading-5 text-slate-600"><span aria-hidden="true">🔐</span><span><strong className="text-slate-900">Password stays with GadgetPoint.</strong> Successful verification creates only a short-lived one-time owner code for WorkflowOS.</span></div>
          </section>

          <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Other owner options</span><div className="h-px flex-1 bg-slate-200" /></div>
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Authorized owner identity</div>
            <div className="mt-1 break-all text-sm font-black text-[#102a43]">{OWNER_EMAIL}</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">All owner routes must resolve to this exact active GadgetPoint owner identity.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href={OWNER_GADGETPOINT_URL} className="ios-action secondary-button flex min-h-[46px] items-center justify-center rounded-[14px] border border-[#b9cce0] px-4 text-center text-sm font-black text-[#214e78]">Use GadgetPoint session</Link>
              <Link href={OWNER_CHATGPT_URL} className="ios-action secondary-button flex min-h-[46px] items-center justify-center rounded-[14px] border border-[#b9cce0] px-4 text-center text-sm font-black text-[#214e78]">Continue with ChatGPT</Link>
            </div>
          </section>

          <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Staff</span><div className="h-px flex-1 bg-slate-200" /></div>
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"><h3 className="text-lg font-black text-slate-950">Use your GadgetPoint staff login</h3><p className="mt-2 text-xs leading-5 text-slate-600">Staff use the normal GadgetPoint username and password created by the owner. WorkflowOS access remains controlled by the owner’s staff permissions.</p><Link href={STAFF_LOGIN_URL} className="ios-action primary-button mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-black">Staff: Sign in with GadgetPoint <span aria-hidden="true">→</span></Link></section>

          <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 sm:grid-cols-3"><div><span className="font-black text-slate-900">No public signup.</span><br />Accounts come from GadgetPoint.</div><div><span className="font-black text-slate-900">No password copy.</span><br />GadgetPoint verifies credentials directly.</div><div><span className="font-black text-slate-900">Independent sessions.</span><br />One-time codes connect them securely.</div></div>
        </div><p className="mt-5 text-center text-xs leading-5 text-slate-500">GadgetPoint Admin runs the store. WorkflowOS runs the work around it.</p></div></section>
      </div>
    </main>
  );
}
