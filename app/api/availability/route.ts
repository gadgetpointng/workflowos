import {NextResponse} from 'next/server';
import {requireUser,canManage} from '@/lib/auth';
export async function POST(req:Request){
  const {supabase,user,profile}=await requireUser(); if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json(); const target=b.user_id||user.id;
  if(target!==user.id&&!canManage(profile.role))return NextResponse.json({error:'Forbidden'},{status:403});
  const row={organization_id:profile.organization_id,user_id:target,status:b.status||'available',available_from:b.available_from||null,available_until:b.available_until||null,note:b.note||null,updated_by:user.id,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('staff_availability').upsert(row,{onConflict:'organization_id,user_id'}).select().single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'availability.updated',entity_type:'profile',entity_id:target,metadata:{status:row.status}});
  return NextResponse.json({data});
}
