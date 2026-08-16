import Link from 'next/link';

const modules = [
  ['Overview', 'Company activity and priorities'],
  ['Tasks', 'Assignments, deadlines and follow-up'],
  ['Opportunities', 'Sales leads and business openings'],
  ['Inbox', 'Staff messages and notifications'],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#101820]">
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-[1450px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#111827] text-sm font-black text-white">W</div>
            <div><div className="text-[18px] font-black tracking-[-.045em]">WorkflowOS</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-[#6b7280]">GadgetPoint Operations</div></div>
          </div>
          <Link href="/login" className="rounded-[8px] bg-[#2377ff] px-5 py-3 text-[11px] font-extrabold text-white transition hover:bg-[#1d67dd]">Sign in</Link>
        </div>
      </header>

      <section className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto grid max-w-[1450px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-12 lg:py-24">
          <div className="max-w-3xl">
            <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#2377ff]">Private company workspace</div>
            <h1 className="mt-4 text-[clamp(44px,6vw,76px)] font-black leading-[.98] tracking-[-.06em] text-[#101820]">The work behind<br/>GadgetPoint.</h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[#667085] sm:text-base">A focused workspace for assignments, opportunities, approvals, staff communication and the day-to-day execution behind the business.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-[46px] items-center justify-center rounded-[8px] bg-[#2377ff] px-5 text-[11px] font-extrabold text-white transition hover:bg-[#1d67dd]">Open WorkflowOS <span className="ml-2">→</span></Link>
              <a href="https://gadgetpoint.ng" className="inline-flex min-h-[46px] items-center justify-center rounded-[8px] border border-[#d0d5dd] bg-white px-5 text-[11px] font-extrabold text-[#344054] transition hover:bg-[#f9fafb]">GadgetPoint <span className="ml-2">↗</span></a>
            </div>
            <div className="mt-7 flex items-center gap-2 text-[10px] font-semibold text-[#667085]"><span className="h-2 w-2 rounded-full bg-[#2377ff]" /> Owner and authorized staff access only</div>
          </div>

          <aside className="rounded-[14px] border border-[#e1e5ea] bg-[#f8f9fb] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e1e5ea] pb-5"><div><div className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#667085]">Workspace</div><h2 className="mt-1 text-lg font-black tracking-[-.03em]">Operations</h2></div><span className="text-[10px] font-bold text-[#667085]">Internal</span></div>
            <div className="mt-4 grid gap-2.5">
              {modules.map(([title, detail]) => <div key={title} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-[9px] border border-[#e1e5ea] bg-white p-3.5"><div className="grid h-[34px] w-[34px] place-items-center rounded-[7px] bg-[#eef2f6] text-[11px] font-black text-[#344054]">{title[0]}</div><div><div className="text-[12px] font-extrabold">{title}</div><div className="mt-1 text-[9px] text-[#7b8794]">{detail}</div></div><span className="text-[#98a2b3]">→</span></div>)}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1450px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div><div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#667085]">How it fits</div><h2 className="mt-3 text-3xl font-black tracking-[-.05em]">One business.<br/>Clear responsibilities.</h2><p className="mt-4 max-w-lg text-[12px] leading-6 text-[#667085]">GadgetPoint handles commerce and store operations. WorkflowOS handles people, work, communication and growth.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['GadgetPoint','Products, orders, inventory and store operations'],['WorkflowOS','Tasks, staff work, opportunities and messages'],['Connected','Important business information can move between both systems'],['Private','No public registration or open workspace creation']].map(([title,detail]) => <div key={title} className="rounded-[10px] border border-[#e1e5ea] bg-white p-5"><div className="text-sm font-black">{title}</div><p className="mt-2 text-[10px] leading-5 text-[#7b8794]">{detail}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e1e5ea] bg-white"><div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[10px] font-semibold text-[#7b8794] sm:px-8 lg:px-12"><span>WorkflowOS · GadgetPoint</span><span>Private internal workspace</span></div></footer>
    </main>
  );
}
