import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function POST(req:Request){
  const {supabase,user,profile}=await requireUser(); if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json(); if(!b.lead_id||!b.due_at) return NextResponse.json({error:'lead_id and due_at are required'},{status:400});
  const {data,error}=await supabase.from('lead_followups').insert({organization_id:profile.organization_id,lead_id:b.lead_id,assigned_to:b.assigned_to||user.id,due_at:b.due_at,channel:b.channel||'whatsapp',notes:b.notes||null,created_by:user.id}).select().single();
  if(error) return NextResponse.json({error:error.message},{status:400});
  await supabase.from('leads').update({next_followup_at:b.due_at,assigned_to:b.assigned_to||user.id,updated_at:new Date().toISOString()}).eq('id',b.lead_id);
  await supabase.from('lead_activities').insert({lead_id:b.lead_id,actor_id:user.id,activity_type:'followup_scheduled',notes:`Follow-up scheduled via ${b.channel||'whatsapp'}`});
  return NextResponse.json({data},{status:201});
}

export async function PATCH(req:Request){
  const {supabase,user,profile}=await requireUser(); if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json(); if(!b.id) return NextResponse.json({error:'id is required'},{status:400});
  const patch:any={updated_at:new Date().toISOString()}; if(b.status) patch.status=b.status; if(b.outcome!==undefined) patch.outcome=b.outcome; if(b.notes!==undefined) patch.notes=b.notes; if(b.status==='completed') patch.completed_at=new Date().toISOString();
  const {data,error}=await supabase.from('lead_followups').update(patch).eq('id',b.id).eq('organization_id',profile.organization_id).select().single();
  if(error) return NextResponse.json({error:error.message},{status:400});
  if(data?.lead_id && b.status==='completed') await supabase.from('leads').update({last_contacted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',data.lead_id);
  return NextResponse.json({data});
}
