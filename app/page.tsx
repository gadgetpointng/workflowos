import Link from 'next/link';

const pillars = [
  ['Execute','Tasks, approvals and staff collaboration.'],
  ['Grow','Campaigns, leads and opportunity intelligence.'],
  ['Connect','GadgetPoint, marketplaces, WhatsApp and other websites.'],
  ['Learn','Turn outcomes and demand signals into the next recommended action.']
];

export default function Home() {
  return <main className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><div><div className="text-sm font-semibold uppercase tracking-[.22em] text-slate-500">Business execution platform</div><h1 className="mt-1 text-2xl font-bold">WorkflowOS</h1></div><div className="flex gap-2"><Link className="rounded-xl border px-4 py-2 text-sm font-semibold" href="/login">Sign in</Link><Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href="/signup">Create workspace</Link></div></div></header><section className="mx-auto max-w-7xl px-6 py-16"><div className="max-w-3xl"><div className="inline-flex rounded-full border bg-white px-3 py-1 text-xs font-semibold">Standalone by design · deeply integratable</div><h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Turn signals into coordinated work—and coordinated work into growth.</h2><p className="mt-5 text-lg leading-8 text-slate-600">WorkflowOS connects teams, campaigns, leads, marketplaces and business systems without becoming locked to any one storefront. GadgetPoint is the first deep integration, not the boundary of the product.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{pillars.map(([title,body])=><article className="rounded-3xl border bg-white p-6 shadow-sm" key={title}><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{body}</p></article>)}</div></section></main>;
}
