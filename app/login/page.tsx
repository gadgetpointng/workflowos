import Link from 'next/link';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const STAFF_LOGIN_URL = 'https://gadgetpoint.ng/staff-login';
const OWNER_GADGETPOINT_URL = 'https://gadgetpoint.ng/admin?workflowos=1';
const OWNER_CHATGPT_URL = 'https://gadgetpoint.ng/signin-with-chatgpt?return_to=%2Fadmin%3Fworkflowos%3D1';

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
            <div><div className="text-lg font-black tracking-tight">WorkflowOS</div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/80">GadgetPoint work operating system</div></div>
          </div>
          <div className="max-w-2xl py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-400" />Identity connected to GadgetPoint</div>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.04] tracking-[-0.04em] xl:text-6xl">One business identity. Two connected systems.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">GadgetPoint authenticates the people. WorkflowOS receives the verified identity and runs the work around the store. No duplicate staff account system is created here.</p>
          </div>
          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Staff credentials remain in GadgetPoint</div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-300" /> WorkflowOS has no public account creation</div></div>
        </section>
        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
          <div className="w-full max-w-lg">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Secure access</div><h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#102a43]">Continue to WorkflowOS</h2></div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Choose the access path that matches who you are. WorkflowOS does not ask staff to create another password.</p>
              {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">{error}</div>}
              {message && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">{message}</div>}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"><h3 className="text-lg font-black text-slate-950">Use your GadgetPoint staff login</h3><p className="mt-2 text-xs leading-5 text-slate-600">Use the normal GadgetPoint username and password created by the owner.</p><Link href={STAFF_LOGIN_URL} className="ios-action primary-button mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-black">Staff: Sign in with GadgetPoint <span aria-hidden="true">→</span></Link></section>
              <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Owner only</span><div className="h-px flex-1 bg-slate-200" /></div>
              <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#52718e]">Authorized owner identity</div><div className="mt-1 break-all text-sm font-black text-[#102a43]">{OWNER_EMAIL}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Link href={OWNER_GADGETPOINT_URL} className="ios-action primary-button flex min-h-[46px] items-center justify-center rounded-[14px] px-4 text-center text-sm font-black">Owner: GadgetPoint sign-in</Link><Link href={OWNER_CHATGPT_URL} className="ios-action secondary-button flex min-h-[46px] items-center justify-center rounded-[14px] border border-[#b9cce0] px-4 text-center text-sm font-black text-[#214e78]">Owner: Continue with ChatGPT</Link></div></section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
