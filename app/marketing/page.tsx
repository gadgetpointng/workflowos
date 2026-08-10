import WorkspaceShell from '@/components/WorkspaceShell';
import {requireUser} from '@/lib/auth';

const channels=[
  {key:'facebook',label:'Facebook / Instagram',note:'Meta lead ads, social campaigns and consented enquiries'},
  {key:'tiktok',label:'TikTok',note:'Lead generation, campaign attribution and product-interest signals'},
  {key:'whatsapp',label:'WhatsApp',note:'Direct buyer conversations and sales follow-up'},
  {key:'storefront',label:'GadgetPoint Storefront',note:'Search, product views, carts and customer enquiries'},
  {key:'facebook_marketplace',label:'Facebook Marketplace',note:'Marketplace demand signals where supported'},
  {key:'marketplace',label:'Other Marketplaces',note:'Jiji, Jumia, Konga and approved future connectors'},
];

export default async function Marketing(){
  const {supabase,profile}=await requireUser();
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [{data:leads},{data:events},{data:integrations}]=await Promise.all([
    supabase.from('leads').select('id,source,status').eq('organization_id',profile.organization_id).gte('created_at',since),
    supabase.from('analytics_events').select('id,source,event_type,amount,created_at').eq('organization_id',profile.organization_id).gte('created_at',since),
    supabase.from('external_integrations').select('slug,name,status,kind,last_synced_at').eq('organization_id',profile.organization_id),
  ]);
  const leadCounts=new Map<string,number>(); for(const x of leads??[]) leadCounts.set(x.source||'unknown',(leadCounts.get(x.source||'unknown')||0)+1);
  const conversionCounts=new Map<string,number>(); for(const x of events??[]) if(['vendor_sale','order','campaign_attribution','acquisition_lead'].includes(x.event_type)) conversionCounts.set(x.source||'unknown',(conversionCounts.get(x.source||'unknown')||0)+1);
  const connected=new Map((integrations??[]).map((x:any)=>[x.slug,x]));
  return <WorkspaceShell title="Marketing" subtitle="Acquisition channels connected to Buyer Intelligence and sales execution" profile={profile}>
    <section className="page-heading"><div><div className="eyebrow">Acquisition command center</div><h1>Marketing channels</h1><p>Track where buyers come from, route consented enquiries into WorkflowOS, and measure which channels create real sales work.</p></div><div className="metric-chip"><strong>{(leads??[]).length}</strong><span>leads · last 30 days</span></div></section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{channels.map(c=>{const integration=connected.get(c.key);const count=(leadCounts.get(c.key)||0)+(c.key==='facebook'?leadCounts.get('instagram')||0:0);return <article key={c.key} className="app-card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{c.label}</h2><p className="mt-1 text-sm text-slate-500">{c.note}</p></div><span className={`status-pill ${integration?.status==='connected'?'':'opacity-60'}`}>{integration?.status||'ready'}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Leads</span><strong className="mt-1 block text-xl">{count}</strong></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Tracked actions</span><strong className="mt-1 block text-xl">{conversionCounts.get(c.key)||0}</strong></div></div></article>})}</section>
    <section className="mt-6 app-card p-6"><h2 className="text-lg font-semibold">Acquisition rule</h2><p className="mt-2 text-sm text-slate-600">Meta and TikTok can send opted-in lead events into WorkflowOS. WorkflowOS scores the buyer, matches GadgetPoint inventory, assigns sales staff and tracks attribution. Public engagement or marketplace demand remains intelligence only until the person has consented to direct contact.</p></section>
  </WorkspaceShell>;
}
