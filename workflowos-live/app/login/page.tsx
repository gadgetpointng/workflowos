import Link from 'next/link';
import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
    <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[.25em] text-slate-500">WorkflowOS</div>
        <h1 className="mt-2 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Secure business execution workspace</p>
      </div>
      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      <form action={login} className="space-y-4">
        <input name="email" required className="w-full rounded-xl border p-3" type="email" placeholder="Email address" />
        <input name="password" required className="w-full rounded-xl border p-3" type="password" placeholder="Password" />
        <button className="w-full rounded-xl bg-slate-950 p-3 font-semibold text-white">Sign in</button>
      </form>
      <p className="mt-5 text-sm text-slate-500">New workspace? <Link href="/signup" className="font-semibold text-slate-900">Create one</Link></p>
    </div>
  </main>;
}
