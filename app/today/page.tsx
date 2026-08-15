import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function Today() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const [recs, tasks, leads, approvals, orders, signals, sites] = await Promise.all([
    supabase.from('growth_recommendations').select('id,title,rationale,score,recommendation_type').eq('organization_id', org).eq('status', 'new').order('score', { ascending: false }).limit(6),
    supabase.from('tasks').select('id,title,status,priority,due_at').eq('organization_id', org).not('status', 'in', '("completed","approved","cancelled")').lte('due_at', soon).order('due_at', { ascending: true }).limit(12),
    supabase.from('leads').select('id,name,source,product_interest,next_followup_at,status').eq('organization_id', org).not('status', 'in', '("purchased","lost")').lte('next_followup_at', soon).order('next_followup_at', { ascending: true }).limit(12),
    supabase.from('approvals').select('id,entity_type,created_at,status').eq('organization_id', org).eq('status', 'pending').order('created_at', { ascending: true }).limit(8),
    supabase.from('connected_orders').select('id,external_order_id,total_amount,currency,channel,status,ordered_at').eq('organization_id', org).order('ordered_at', { ascending: false }).limit(5),
    supabase.from('commerce_signals').select('id,source,signal_type,product_ref,search_query,value,observed_at').eq('organization_id', org).order('observed_at', { ascending: false }).limit(8),
    supabase.from('connected_sites').select('id,name,domain,status').eq('organization_id', org).order('created_at', { ascending: true }),
  ]);

  const taskRows = tasks.data ?? [];
  const leadRows = leads.data ?? [];
  const overdueTasks = taskRows.filter((task: any) => task.due_at && new Date(task.due_at) < now);
  const dueLeads = leadRows.filter((lead: any) => lead.next_followup_at && new Date(lead.next_followup_at) <= now);
  const facebookLeads = leadRows.filter((lead: any) => String(lead.source || '').toLowerCase().includes('facebook'));
  const pendingApprovals = approvals.data ?? [];
  const recommendations = recs.data ?? [];
  const actionCount = overdueTasks.length + dueLeads.length + pendingApprovals.length + recommendations.length;

  const commandItems = [
    overdueTasks.length ? { tone: 'red', title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} need attention`, detail: overdueTasks[0]?.title || 'Review overdue work', href: '/tasks', action: 'Resolve tasks' } : null,
    dueLeads.length ? { tone: 'amber', title: `${dueLeads.length} buyer follow-up${dueLeads.length === 1 ? '' : 's'} due now`, detail: `${facebookLeads.length ? `${facebookLeads.length} from Facebook · ` : ''}${dueLeads[0]?.name || 'Buyer'} is waiting`, href: '/leads', action: 'Follow up' } : null,
    pendingApprovals.length ? { tone: 'violet', title: `${pendingApprovals.length} approval${pendingApprovals.length === 1 ? '' : 's'} waiting`, detail: 'Management decisions are blocking work', href: '/approvals', action: 'Review approvals' } : null,
    recommendations.length ? { tone: 'blue', title: `${recommendations.length} business move${recommendations.length === 1 ? '' : 's'} recommended`, detail: recommendations[0]?.title || 'Review the highest-value recommendation', href: '/opportunities', action: 'Review moves' } : null,
  ].filter(Boolean) as Array<{tone:string;title:string;detail:string;href:string;action:string}>;

  const toneClass: Record<string,string> = {
    red: 'border-red-200 bg-red-50 text-red-800', amber: 'border-amber-200 bg-amber-50 text-amber-800', violet: 'border-violet-200 bg-violet-50 text-violet-800', blue: 'border-blue-200 bg-blue-50 text-blue-800'
  };

  return (
    <WorkspaceShell title="Today" subtitle="Your daily command center" profile={profile}>
      <div className="space-y-5">
        <section className="border border-[#e4e7ec] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#2377ff]">Morning command</div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#08111f] sm:text-3xl">{actionCount ? `${actionCount} actions deserve attention today` : 'The business is clear for action'}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#697586]">WorkflowOS has combined urgent work, buyer follow-ups, approvals and business recommendations into one operating queue.</p>
            </div>
            <div className="border border-[#dbe9df] bg-[#f4fbf6] px-3 py-2 text-xs font-bold text-[#3f7951]">● {sites.data?.length ?? 0} connected site{sites.data?.length === 1 ? '' : 's'}</div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Overdue work', overdueTasks.length, '/tasks'], ['Buyer follow-ups', dueLeads.length, '/leads'], ['Approvals', pendingApprovals.length, '/approvals'], ['Recommended moves', recommendations.length, '/opportunities']
          ].map(([label,value,href]) => <Link key={String(label)} href={String(href)} className="border border-[#e4e7ec] bg-white p-4 transition hover:border-[#2377ff]"><div className="text-[11px] font-bold uppercase tracking-wide text-[#8b95a3]">{label}</div><div className="mt-2 text-3xl font-black text-[#08111f]">{value}</div><div className="mt-2 text-xs font-bold text-[#2377ff]">Open →</div></Link>)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <div className="border border-[#e4e7ec] bg-white">
            <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4"><div><h2 className="font-black text-[#08111f]">Do these first</h2><p className="mt-1 text-xs text-[#8b95a3]">Highest-value operating actions, in one queue.</p></div><Link href="/my-work" className="text-xs font-bold text-[#2377ff]">My Work →</Link></div>
            <div className="divide-y divide-[#eef0f3]">
              {commandItems.map((item,index) => <Link key={item.title} href={item.href} className="flex gap-4 p-5 transition hover:bg-[#f8f9fb]"><div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#08111f] text-xs font-black text-white">{index+1}</div><div className="min-w-0 flex-1"><div className="font-bold text-[#111827]">{item.title}</div><div className="mt-1 text-sm text-[#697586]">{item.detail}</div><span className={`mt-3 inline-block border px-2.5 py-1 text-[10px] font-black uppercase ${toneClass[item.tone]}`}>{item.action}</span></div></Link>)}
              {!commandItems.length && <div className="p-8 text-center"><div className="text-lg font-black text-[#08111f]">Nothing urgent is waiting.</div><div className="mt-2 text-sm text-[#697586]">Use the time for buyer acquisition, stock review or planned work.</div><div className="mt-4 flex justify-center gap-2"><Link href="/acquisition" className="bg-[#2377ff] px-3 py-2 text-xs font-bold text-white">Get buyers</Link><Link href="/catalog" className="border border-[#e4e7ec] px-3 py-2 text-xs font-bold text-[#111827]">Review stock</Link></div></div>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="border border-[#e4e7ec] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-black text-[#08111f]">Buyer watch</h2><Link href="/leads" className="text-xs font-bold text-[#2377ff]">All leads →</Link></div><div className="mt-4 space-y-2">{leadRows.slice(0,5).map((lead:any)=><Link href="/leads" key={lead.id} className="block border border-[#eef0f3] p-3 hover:bg-[#f8f9fb]"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-[#111827]">{lead.name || 'Unnamed buyer'}</span><span className="text-[10px] font-black uppercase text-[#2377ff]">{lead.source || 'lead'}</span></div><div className="mt-1 truncate text-xs text-[#697586]">{lead.product_interest || 'General enquiry'}</div></Link>)}{!leadRows.length&&<div className="text-sm text-[#697586]">No follow-ups due in the next 24 hours.</div>}</div></div>

            <div className="border border-[#e4e7ec] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-black text-[#08111f]">Live demand</h2><Link href="/analytics" className="text-xs font-bold text-[#2377ff]">Analytics →</Link></div><div className="mt-4 flex flex-wrap gap-2">{(signals.data ?? []).slice(0,6).map((signal:any)=><span key={signal.id} className="border border-[#e4e7ec] bg-[#f8f9fb] px-2.5 py-1.5 text-xs font-semibold text-[#4b5563]">{signal.search_query || signal.product_ref || signal.signal_type}</span>)}{!signals.data?.length&&<span className="text-sm text-[#697586]">No demand signals yet.</span>}</div></div>
          </div>
        </section>

        <section className="border border-[#e4e7ec] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-[#08111f]">Connected commerce</h2><p className="mt-1 text-xs text-[#8b95a3]">Latest orders across connected channels.</p></div><Link href="/analytics" className="text-xs font-bold text-[#2377ff]">View analytics →</Link></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">{(orders.data ?? []).map((order:any)=><div key={order.id} className="border border-[#eef0f3] p-3"><div className="truncate text-xs font-bold text-[#111827]">Order {order.external_order_id}</div><div className="mt-1 text-[10px] uppercase text-[#8b95a3]">{order.channel || 'Store'} · {order.status}</div><div className="mt-3 font-black text-[#08111f]">{order.currency || 'NGN'} {Number(order.total_amount || 0).toLocaleString()}</div></div>)}{!orders.data?.length&&<div className="text-sm text-[#697586]">No connected orders yet.</div>}</div></section>
      </div>
    </WorkspaceShell>
  );
}
