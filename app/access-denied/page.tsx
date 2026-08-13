import Link from 'next/link';

const labels: Record<string,string> = {
  work: 'daily work',
  operations: 'operations workflow',
  sales: 'growth and sales',
  marketing: 'campaigns and goals',
  commerce: 'commerce',
  intelligence: 'analytics and AI',
};

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const reason = String(params.reason ?? 'permission');
  const area = String(params.area ?? '');
  const disabled = reason === 'disabled';
  const areaLabel = labels[area] || 'this WorkflowOS area';
  return <main className="min-h-screen bg-[#f7f7f7] px-4 py-10 text-[#171717]">
    <section className="mx-auto max-w-xl overflow-hidden rounded-xl border border-[#e2e2e2] bg-white shadow-sm">
      <div className="border-b border-[#ededed] px-6 py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#737373]">GadgetPoint staff access</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.03em]">{disabled ? 'WorkflowOS access is not enabled.' : `You do not have access to ${areaLabel}.`}</h1>
        <p className="mt-3 text-sm leading-6 text-[#737373]">Your GadgetPoint staff account is still active. WorkflowOS only opens the work areas approved by the GadgetPoint owner.</p>
      </div>
      <div className="space-y-3 px-6 py-5 text-sm text-[#525252]">
        <div className="rounded-lg border border-[#e6e6e6] bg-[#fafafa] p-4"><strong className="block text-[#262626]">What to do</strong><span className="mt-1 block text-xs leading-5 text-[#777]">Ask the GadgetPoint owner to enable WorkflowOS and select the work areas you need in GadgetPoint Admin → WorkflowOS access.</span></div>
        <div className="rounded-lg border border-[#d9efe5] bg-[#f3fbf7] p-4"><strong className="block text-[#1f6f52]">Your password stays private</strong><span className="mt-1 block text-xs leading-5 text-[#5f766c]">WorkflowOS never receives your GadgetPoint password. Access is controlled by a short-lived verified handoff and the owner-approved permissions.</span></div>
      </div>
      <footer className="flex flex-col gap-2 border-t border-[#ededed] px-6 py-5 sm:flex-row">
        <a href="https://gadgetpoint.ng/admin" className="rounded-md bg-[#202020] px-4 py-2.5 text-center text-xs font-semibold text-white">Return to GadgetPoint Admin</a>
        <Link href="/dashboard" className="rounded-md border border-[#d8d8d8] px-4 py-2.5 text-center text-xs font-semibold text-[#404040]">WorkflowOS overview</Link>
      </footer>
    </section>
  </main>;
}
