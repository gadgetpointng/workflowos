import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

function nextRun(cadence:string){
  const d=new Date();
  if(cadence==='daily') d.setDate(d.getDate()+1);
  else if(cadence==='weekdays'){ do{d.setDate(d.getDate()+1)}while([0,6].includes(d.getDay())); }
  else if(cadence==='monthly') d.setMonth(d.getMonth()+1);
  else d.setDate(d.getDate()+7);
  return d.toISOString();
}

export async function GET(){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data,error}=await supabase.from('recurring_work_templates').select('*,assignee:profiles!recurring_work_templates_assignee_id_fkey(id,full_name)').eq('organization_id',profile.organization_id).order('created_at',{ascending:false});
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({data});
}

export async function POST(req:Request){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManage(profile.role))return NextResponse.json({error:'Forbidden'},{status:403});
  const b=await req.json();
  if(!b.name)return NextResponse.json({error:'name is required'},{status:400});
  const cadence=b.cadence??'weekly';
  const {data,error}=await supabase.from('recurring_work_templates').insert({organization_id:profile.organization_id,name:b.name,description:b.description??null,department:b.department??null,capability:b.capability??'operations',assignee_id:b.assignee_id??null,priority:b.priority??'medium',cadence,due_offset_hours:Number(b.due_offset_hours??24),active:true,next_run_at:nextRun(cadence),created_by:user.id}).select().single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'recurring_work.created',entity_type:'recurring_work_template',entity_id:data.id});
  return NextResponse.json({data},{status:201});
}
