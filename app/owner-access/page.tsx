import Link from 'next/link';
import { sendOwnerEmailLink } from '@/app/login/actions';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

export default function OwnerAccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-8">
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-2xl sm:p-8">
          <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Free owner access
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            Sign in with your owner email
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            WorkflowOS will send one secure, one-time sign-in link only to the authorized GadgetPoint owner email. No WorkflowOS password is required.
          </p>

          <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
              Authorized owner
            </div>
            <div className="mt-1 break-all text-base font-black text-white">{OWNER_EMAIL}</div>
          </div>

          <form action={sendOwnerEmailLink} className="mt-6">
            <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-950/30 transition hover:-translate-y-0.5">
              Email me a secure sign-in link →
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Open the email on the same browser and follow the link. After verification, WorkflowOS will recognize this email as the owner identity and retire any older mistaken owner profile safely.
          </p>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <Link href="/login" className="text-xs font-bold text-cyan-200 hover:text-white">
              Back to normal sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
