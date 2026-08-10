import Link from 'next/link';
import { signup } from './actions';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
    <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[.25em] text-slate-500">WorkflowOS</div>
      <h1 className="mt-2 text-3xl font-bold">Create your workspace</h1>
      <p className="mt-2 text-sm text-slate-500">Start as the workspace owner. You can invite staff after signing in.</p>
      {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form action={signup} className="mt-6 space-y-4">
        <input name="fullName" required minLength={2} className="w-full rounded-xl border p-3" placeholder="Your full name" />
        <input name="organizationName" required minLength={2} className="w-full rounded-xl border p-3" placeholder="Business / workspace name" />
        <input name="email" required className="w-full rounded-xl border p-3" type="email" placeholder="Email address" />
        <input name="password" required minLength={8} className="w-full rounded-xl border p-3" type="password" placeholder="Password (8+ characters)" />
        <button className="w-full rounded-xl bg-slate-950 p-3 font-semibold text-white">Create workspace</button>
      </form>
      <p className="mt-5 text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-slate-900">Sign in</Link></p>
    </div>
  </main>;
}
