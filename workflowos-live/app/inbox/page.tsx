import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import Link from 'next/link';
import NotificationActions from '@/components/NotificationActions';

export default async function Inbox(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const [{data:notifications},{data:conversations},{data:recommendations}]=await Promise.all([
  supabase.from('notifications').select('*').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(60),
  supabase.from('customer_conversations').select('*').eq('organization_id',profile.organization_id).in('status',['open','pending']).order('created_at',{ascending:false}).limit(30),
  supabase.from('growth_recommendations').select('*').eq('organization_id',profile.organization_id).eq('status','new').order('score',{ascending:false}).limit(30)
 ]);
 const unread=(notifications??[]).filter((n:any)=>!n.read_at).length;
 return <WorkspaceShell title="Inbox" subtitle="Notifications, customer conversations and growth alerts" profile={profile}>
  <section className="page-heading"><div><div className="eyebrow">Attention center</div><h1>Inbox</h1><p>One place for staff notifications, customer conversations and high-priority growth signals.</p></div><div className="metric-chip"><strong>{unread}</strong><span>unread</span></div></section>
  <section className="grid gap-5 xl:grid-cols-3">
   <div className="app-card p-5"><h2 className="section-title">Notifications</h2><div className="stack-list">{(notifications??[]).map((n:any)=><article key={n.id} className={`stack-item ${!n.read_at?'stack-item-active':''}`}><strong>{n.title}</strong><p>{n.body||''}</p><div className="mt-3 flex items-center justify-between gap-2"><small>{new Date(n.created_at).toLocaleString()}</small><NotificationActions id={n.id} read={Boolean(n.read_at)}/></div></article>)}{!(notifications??[]).length&&<div className="empty-dropzone">No notifications</div>}</div></div>
   <div className="app-card p-5"><h2 className="section-title">Customer conversations</h2><div className="stack-list">{(conversations??[]).map((c:any)=><Link href={`/conversations/${c.id}`} key={c.id} className="stack-item block"><div className="flex justify-between gap-2"><strong>{c.customer_name||c.customer_phone||'Customer'}</strong><span className="source-pill">{c.channel}</span></div><p>{c.last_message||c.subject||'New conversation'}</p><small>{c.status}</small></Link>)}{!(conversations??[]).length&&<div className="empty-dropzone">No open conversations</div>}</div></div>
   <div className="app-card p-5"><h2 className="section-title">Growth alerts</h2><div className="stack-list">{(recommendations??[]).map((r:any)=><article key={r.id} className="stack-item"><div className="flex justify-between gap-2"><strong>{r.title}</strong><b>{Number(r.score).toFixed(0)}</b></div><p>{r.rationale||'Recommended action'}</p><small>{r.recommendation_type}</small></article>)}{!(recommendations??[]).length&&<div className="empty-dropzone">No new recommendations</div>}</div></div>
  </section>
 </WorkspaceShell>
}
