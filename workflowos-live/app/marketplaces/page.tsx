import WorkspaceShell from '@/components/WorkspaceShell';
export default function Marketplaces() {
  const platforms = [
    ['Facebook Marketplace', 'Demand + listing workflow', 'Connector target'],
    ['Jumia', 'Catalog + order workflow', 'Connector target'],
    ['Jiji', 'Demand + guided listing workflow', 'Connector target'],
    ['Konga', 'Catalog + order workflow', 'Connector target']
  ];
  return <main className="mx-auto max-w-7xl px-6 py-10"><div className="text-sm font-semibold uppercase tracking-[.2em] text-slate-500">Channel operations</div><h1 className="mt-2 text-3xl font-bold">Marketplace Hub</h1><p className="mt-2 max-w-3xl text-slate-600">Bring marketplace demand, listings and work into WorkflowOS. Connect only through supported, authorized methods for each platform.</p><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{platforms.map(([name,mode,status])=><div className="rounded-3xl border bg-white p-6 shadow-sm" key={name}><h2 className="text-lg font-semibold">{name}</h2><p className="mt-2 min-h-10 text-sm text-slate-500">{mode}</p><div className="mt-5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium">{status}</div></div>)}</div><section className="mt-8 rounded-3xl border bg-white p-7"><h2 className="text-xl font-semibold">Market intelligence pipeline</h2><p className="mt-2 text-sm text-slate-600">Signals → opportunity score → recommended action → staff task → sales result → learning loop.</p></section></main>;
}