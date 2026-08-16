import Link from 'next/link';
import KineticGrid from '../components/kinetic-grid';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08131f] text-white">
      <KineticGrid background="#08131f" dotColor="#dbeafe" lineColor="#2563eb" trailColor="#60a5fa" spacing={34} radius={360} strength={3} trail />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08131f]/30 via-[#08131f]/55 to-[#08131f]/95" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1380px] flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 py-5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-sm font-black backdrop-blur">W</div><div><div className="font-black tracking-tight">WorkflowOS</div><div className="text-[9px] font-bold uppercase tracking-[.18em] text-blue-200/60">GadgetPoint Operations</div></div></div>
          <Link href="/login" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black backdrop-blur transition hover:bg-white/15">Sign in</Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-[#0b2133]/70 px-3 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Private company workspace</div>
            <h1 className="mt-7 text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-6xl xl:text-7xl">Run the work.<br/><span className="text-blue-300">Move the business.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">One focused operating workspace for GadgetPoint tasks, opportunities, approvals, messages and team execution.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-500 px-6 text-sm font-black shadow-xl shadow-blue-950/30 transition hover:bg-blue-400">Open WorkflowOS <span className="ml-2">→</span></Link><span className="inline-flex min-h-12 items-center rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-slate-300 backdrop-blur">Owner + authorized staff only</span></div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-[#0b1826]/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-300">Workspace</div><h2 className="mt-1 text-xl font-black">Ready for operations</h2></div><span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">Online</span></div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {['Overview','Tasks','Opportunities','Inbox'].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.045] p-4"><div className="h-2 w-2 rounded-full bg-blue-400"/><div className="mt-5 text-sm font-black">{item}</div><div className="mt-1 text-[11px] text-slate-500">Company workspace</div></div>)}
            </div>
            <div className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-400/[.06] p-4"><div className="text-xs font-black text-blue-200">Secure access</div><p className="mt-2 text-xs leading-5 text-slate-400">No public workspace creation. Sign in with your authorized GadgetPoint identity to continue.</p></div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-[11px] font-semibold text-slate-500"><span>WorkflowOS · GadgetPoint</span><span>Private business operating system</span></footer>
      </div>
    </main>
  );
}
