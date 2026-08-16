import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const channels = [
  {
    name: 'Facebook',
    icon: 'f',
    state: 'Lead capture ready',
    detail: 'Connect the GadgetPoint Facebook Page so Lead Ads can create CRM leads and enter the existing follow-up workflow automatically.',
    actionHref: '/integrations/facebook-leads',
    actionLabel: 'Configure Facebook leads',
  },
  {
    name: 'Instagram',
    icon: '◎',
    state: 'Meta setup required',
    detail: 'Prepare the Instagram professional account and Meta Business connection before publishing, inbox and insight sync are activated.',
    actionHref: '/integrations',
    actionLabel: 'Open integrations',
  },
] as const;

const sections = [
  ['Content calendar', 'Plan posts and campaigns across Facebook and Instagram.'],
  ['Publishing queue', 'Prepare, approve and schedule content before it goes live.'],
  ['Social inbox', 'Bring comments and customer messages into one working queue.'],
  ['Performance', 'Track reach, engagement, enquiries and campaign outcomes.'],
] as const;

export default async function SocialWorkspace() {
  const { user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  return (
    <WorkspaceShell title="Social" subtitle="Facebook & Instagram" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2377ff]">Growth</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#101820]">Facebook & Instagram</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">Manage GadgetPoint social setup, campaigns and customer acquisition from WorkflowOS. Facebook Lead Ads already have a protected integration path; Meta account activation remains explicit.</p>
          </div>
          <Link href="/campaigns" className="rounded-[8px] border border-[#d0d5dd] bg-white px-4 py-2.5 text-[11px] font-extrabold text-[#344054]">Open campaigns</Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {channels.map((channel) => (
            <article key={channel.name} className="rounded-[12px] border border-[#e1e5ea] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#111827] text-sm font-black text-white">{channel.icon}</div>
                  <div><h2 className="text-base font-black text-[#101820]">{channel.name}</h2><div className="mt-1 text-[10px] font-bold text-[#98a2b3]">{channel.state}</div></div>
                </div>
                <span className="rounded-[6px] border border-[#f0d6d6] bg-[#fff7f7] px-2.5 py-1.5 text-[9px] font-black text-[#a44]">Setup required</span>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-[#667085]">{channel.detail}</p>
              <div className="mt-5 rounded-[8px] border border-[#e1e5ea] bg-[#f8f9fb] p-3.5 text-[10px] leading-5 text-[#667085]">Connection uses the official Meta business integration. WorkflowOS does not need or store a Facebook or Instagram account password.</div>
              <Link href={channel.actionHref} className="mt-4 inline-flex rounded-[8px] bg-[#101820] px-3.5 py-2.5 text-[10px] font-black text-white transition hover:bg-[#2377ff]">{channel.actionLabel} →</Link>
            </article>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map(([title, detail]) => (
            <article key={title} className="rounded-[10px] border border-[#e1e5ea] bg-white p-5">
              <div className="h-1 w-7 rounded-full bg-[#2377ff]" />
              <h2 className="mt-5 text-sm font-black text-[#101820]">{title}</h2>
              <p className="mt-2 text-[10px] leading-5 text-[#7b8794]">{detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[12px] border border-[#e1e5ea] bg-white p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667085]">Connection checklist</div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[#101820]">Meta business setup</h2>
              <p className="mt-3 text-[11px] leading-6 text-[#667085]">Activate the Facebook lead path first, then extend the same official Meta Business connection to Instagram publishing, inbox and insights when those permissions are approved.</p>
              <Link href="/integrations/facebook-leads" className="mt-4 inline-flex text-[10px] font-black text-[#2377ff]">Start with Facebook Lead Ads →</Link>
            </div>
            <div className="grid gap-2.5">
              {['Facebook Page connected to Meta Business','Instagram professional account linked to that Page','Meta app/API access configured','WorkflowOS permissions approved for the features being activated'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-[8px] border border-[#e1e5ea] bg-[#f8f9fb] p-3.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-black text-[#667085] ring-1 ring-[#d0d5dd]">{index + 1}</span><span className="text-[10px] font-semibold text-[#475467]">{item}</span></div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
