import { NextRequest, NextResponse } from 'next/server';
import { canManage, requireUser } from '@/lib/auth';

export async function GET(){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data,error}=await supabase.from('automation_rules').select('*').eq('organization_id',profile.organization_id).order('created_at',{ascending:false});
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({automations:data??[]});
}

export async function POST(req:NextRequest){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManage(profile.role)) return NextResponse.json({error:'Manager access required'},{status:403});
  const body=await req.json();
  if(!body.name||!body.trigger_event||!body.action_type) return NextResponse.json({error:'name, trigger_event and action_type are required'},{status:400});
  const payload={organization_id:profile.organization_id,name:body.name,trigger_event:body.trigger_event,action_type:body.action_type,conditions:body.conditions??{},action_config:body.action_config??{},capability:body.capability??'operations',priority:body.priority??'medium',active:body.active!==false,created_by:user.id};
  const {data,error}=await supabase.from('automation_rules').insert(payload).select('*').single();
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({automation:data},{status:201});
}

export async function PATCH(req:NextRequest){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManage(profile.role)) return NextResponse.json({error:'Manager access required'},{status:403});
  const body=await req.json(); if(!body.id) return NextResponse.json({error:'id is required'},{status:400});
  const updates:any={updated_at:new Date().toISOString()};
  for(const key of ['name','active','trigger_event','action_type','conditions','action_config','capability','priority']) if(body[key]!==undefined) updates[key]=body[key];
  const {data,error}=await supabase.from('automation_rules').update(updates).eq('id',body.id).eq('organization_id',profile.organization_id).select('*').single();
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({automation:data});
}
