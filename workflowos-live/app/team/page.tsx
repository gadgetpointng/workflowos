import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import CapabilityManager from '@/components/CapabilityManager';
import WorkspaceShell from '@/components/WorkspaceShell';
import TeamInvite from '@/components/TeamInvite';

export default async function Team(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 const [{data:people},{data:caps},{data:links}]=await Promise.all([
  supabase.from('profiles').select('id,full_name,email,role,department,active').eq('organization_id',profile.organization_id).order('full_name'),
  supabase.from('staff_capabilities').select('*').eq('organization_id',profile.organization_id).order('capability'),
  supabase.from('shared_identity_links').select('profile_id,integration_id,external_staff_id,verified_at').eq('organization_id',profile.organization_id)
 ]);
 const byProfile=new Map<string,any[]>(); for(const c of caps??[]){byProfile.set(c.profile_id,[...(byProfile.get(c.profile_id)||[]),c]);}
 return <WorkspaceShell title="Team" subtitle="People, capabilities and shared identity" profile={profile}><div className="text-sm font-semibold uppercase tracking-[.2em] text-slate-500">People & routing</div><h1 className="mt-2 text-3xl font-bold">Team capabilities</h1><p className="mt-2 text-slate-600">Define what each staff member can do so WorkflowOS can route sales, marketplace, campaign and operations work intelligently.</p>
  {['owner','admin','manager'].includes(profile.role) && <TeamInvite />}
  <CapabilityManager people={(people??[]) as any}/>
  <div className="mt-8 grid gap-4 lg:grid-cols-2">{(people??[]).map((p:any)=>{const pc=byProfile.get(p.id)||[];const linked=(links??[]).filter((l:any)=>l.profile_id===p.id).length;return <article key={p.id} className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{p.full_name}</h2><div className="text-sm text-slate-500">{p.role}{p.department?` · ${p.department}`:''}</div></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{linked} identity link{linked===1?'':'s'}</span></div><div className="mt-4 flex flex-wrap gap-2">{pc.length?pc.map((c:any)=><span key={c.id} className="rounded-full border px-3 py-1 text-xs font-medium">{c.capability} · {c.proficiency}/5</span>):<span className="text-sm text-slate-400">No capabilities assigned yet.</span>}</div></article>})}</div>
 </WorkspaceShell>
}