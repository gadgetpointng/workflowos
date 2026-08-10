import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { capabilityForOpportunity } from '@/lib/decision/routing';
export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const capability = body.capability || capabilityForOpportunity(body.opportunity_type || body.type);
  const { data:caps, error } = await supabase.from('staff_capabilities').select('profile_id,capability,proficiency,profiles(full_name,email,role,department,active)').eq('organization_id', profile.organization_id).eq('capability', capability).eq('active', true).order('proficiency', { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const ids=(caps??[]).filter((x:any)=>x.profiles?.active!==false).map((x:any)=>x.profile_id);
  const {data:open}=ids.length?await supabase.from('tasks').select('assignee_id,priority,due_at,status').eq('organization_id',profile.organization_id).in('assignee_id',ids).not('status','in','("completed","cancelled")'):{data:[] as any[]};
  const now=Date.now();
  const candidates=(caps??[]).filter((x:any)=>x.profiles?.active!==false).map((x:any)=>{const work=(open??[]).filter((t:any)=>t.assignee_id===x.profile_id);const overdue=work.filter((t:any)=>t.due_at&&new Date(t.due_at).getTime()<now).length;const urgent=work.filter((t:any)=>t.priority==='urgent').length;const load=Math.min(100,work.length*12+overdue*15+urgent*12);const routing_score=Math.max(0,Math.round(Number(x.proficiency||1)*20-load*.55));return {...x,open_tasks:work.length,overdue_tasks:overdue,load_score:load,routing_score}}).sort((a:any,b:any)=>b.routing_score-a.routing_score).slice(0,5);
  return NextResponse.json({ capability, recommended:candidates[0]??null, candidates });
}
