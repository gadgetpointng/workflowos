import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

function nextRun(cadence:string){ const d=new Date(); if(cadence==='daily')d.setDate(d.getDate()+1); else if(cadence==='weekdays'){do{d.setDate(d.getDate()+1)}while([0,6].includes(d.getDay()));} else if(cadence==='monthly')d.setMonth(d.getMonth()+1); else d.setDate(d.getDate()+7); return d.toISOString(); }

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManage(profile.role))return NextResponse.json({error:'Forbidden'},{status:403});
  const {data:t,error:e}=await supabase.from('recurring_work_templates').select('*').eq('id',id).eq('organization_id',profile.organization_id).single();
  if(e||!t)return NextResponse.json({error:'Template not found'},{status:404});
  const due=new Date(Date.now()+Number(t.due_offset_hours||24)*3600000).toISOString();
  const {data:task,error}=await supabase.from('tasks').insert({organization_id:profile.organization_id,title:t.name,description:t.description,creator_id:user.id,assignee_id:t.assignee_id,department:t.department,priority:t.priority,status:t.assignee_id?'assigned':'draft',due_at:due}).select().single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(t.assignee_id)await supabase.from('notifications').insert({organization_id:profile.organization_id,recipient_id:t.assignee_id,title:'Recurring task assigned',body:t.name,type:'task_assigned'});
  await supabase.from('recurring_work_runs').insert({organization_id:profile.organization_id,template_id:t.id,task_id:task.id,status:'generated',generated_for:new Date().toISOString()});
  await supabase.from('recurring_work_templates').update({last_generated_at:new Date().toISOString(),next_run_at:nextRun(t.cadence),updated_at:new Date().toISOString()}).eq('id',t.id);
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'recurring_work.generated',entity_type:'task',entity_id:task.id,metadata:{template_id:t.id}});
  return NextResponse.json({data:task},{status:201});
}
