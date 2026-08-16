import Link from 'next/link';

const modules = [
  ['Overview', 'Company activity and priorities'],
  ['Tasks', 'Assignments, deadlines and follow-up'],
  ['Opportunities', 'Sales leads and business openings'],
  ['Inbox', 'Staff messages and notifications'],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f6f8] text-[#07101f]">
      <div className="flex min-h-[34px] items-center justify-center gap-5 bg-[#2377ff] px-5 py-2 text-center text-[10px] font-bold uppercase tracking-[.08em] text-white sm:text-[11px]">
        <span>GadgetPoint internal operations</span>
        <span className="hidden opacity-80 sm:inline">Owner + authorized staff only</span>
      </div>

      <section className="relative overflow-hidden bg-[#07101f] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_38%,rgba(35,119,255,.28),transparent_28%),linear-gradient(135deg,#07101f,#111d31_58%,#102945)]" />
        <header className="relative z-10 grid min-h-[82px] grid-cols-[1fr_auto] items-center border-b border-white/10 px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-[5vw]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[7px] bg-[#2377ff] text-sm font-black">W</div>
            <div className="leading-none">
              <div className="text-[18px] font-extrabold tracking-[-.055em]">Workflow<span className="font-medium">OS</span><i className="not-italic text-[#4b95ff]">.</i></div>
              <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-[#9aa8bb]">GadgetPoint operations</div>
            </div>
          </div>

          <div className="hidden text-[11px] font-semibold text-[#cfdaeb] lg:block">Work · Growth · Communication</div>

          <div className="flex justify-end">
            <Link href="/login" className="inline-flex min-h-[38px] items-center rounded-[7px] border border-white/20 bg-white/[.08] px-4 text-[11px] font-extrabold transition hover:border-[#75a7ff] hover:bg-[#2377ff]/20">Sign in <span className="ml-2 text-[#75a7ff]">↗</span></Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1500px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-[7vw] lg:py-24">
          <div className="max-w-3xl">
            <div className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#79aef6]">Private business workspace</div>
            <h1 className="mt-4 max-w-4xl text-[clamp(46px,7vw,82px)] font-black leading-[.96] tracking-[-.065em]">The work behind <span className="text-[#5a9cff]">GadgetPoint.</span></h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[#bac7d8] sm:text-base">WorkflowOS is where GadgetPoint staff manage assignments, opportunities, approvals, messages and the day-to-day work that keeps the business moving.</p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/login" className="inline-flex min-h-[46px] items-center justify-center rounded-[7px] bg-[#2377ff] px-5 text-[11px] font-extrabold transition hover:bg-[#4b95ff]">Open WorkflowOS <span className="ml-2">→</span></Link>
              <a href="https://gadgetpoint.ng" className="inline-flex min-h-[46px] items-center justify-center rounded-[7px] border border-[#49627f] bg-white/[.07] px-5 text-[11px] font-extrabold text-[#d6e0ec] transition hover:bg-white/[.11]">Go to GadgetPoint <span className="ml-2 text-[#75a7ff]">↗</span></a>
            </div>
          </div>

          <aside className="rounded-[13px] border border-[#35506f] bg-white/[.045] p-6 shadow-[0_24px_60px_rgba(0,0,0,.18)] sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div><div className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#79aef6]">Operations access</div><div className="mt-2 text-lg font-extrabold tracking-[-.03em]">WorkflowOS workspace</div></div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#72e19b]"><span className="h-2 w-2 rounded-full bg-[#72e19b]" /> Online</div>
            </div>
            <div className="mt-5 grid gap-3">
              {modules.map(([title, detail]) => (
                <div key={title} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-[9px] border border-white/10 bg-[#0d1929]/80 p-3.5">
                  <div className="grid h-9 w-9 place-items-center rounded-[7px] bg-[#2377ff]/15 text-[11px] font-black text-[#75a7ff]">{title.slice(0,1)}</div>
                  <div><div className="text-[12px] font-extrabold text-white">{title}</div><div className="mt-1 text-[9px] leading-4 text-[#8fa1b8]">{detail}</div></div>
                  <span className="text-[#4b95ff]">→</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-[7vw] lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#2377ff]">One company · two systems</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.055em] sm:text-4xl">GadgetPoint sells.<br/>WorkflowOS runs the work.</h2>
            <p className="mt-4 max-w-xl text-[12px] leading-6 text-[#6d7d91]">The store and admin system remain responsible for commerce. WorkflowOS stays focused on people, execution, communication and growth—connected without becoming the same application.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['GadgetPoint', 'Products, orders, inventory and store operations'],
              ['WorkflowOS', 'Tasks, staff work, opportunities and messages'],
              ['Connected', 'Business information can move between both systems'],
              ['Controlled', 'No public workspace creation or open registration'],
            ].map(([title, detail]) => (
              <div key={title} className="min-h-[150px] rounded-[11px] border border-[#dde5ee] bg-white p-5 shadow-[0_12px_35px_rgba(23,53,93,.04)]">
                <div className="h-1 w-8 rounded-full bg-[#2377ff]" />
                <div className="mt-8 text-base font-extrabold tracking-[-.03em]">{title}</div>
                <p className="mt-2 text-[10px] leading-5 text-[#718095]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 bg-[#091526] px-5 py-7 text-[10px] font-semibold text-[#c5d1df] sm:px-8 lg:px-[7vw]">
        <span>WorkflowOS · GadgetPoint</span>
        <span className="text-[#75a7ff]">Private internal workspace</span>
      </footer>
    </main>
  );
}
