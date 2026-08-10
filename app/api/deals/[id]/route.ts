import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json(); const patch:any={updated_at:new Date().toISOString()};
  for(const k of ['title','owner_id','stage','amount','currency','probability','expected_close_at','source','product_interest','loss_reason','notes']) if(b[k]!==undefined) patch[k]=b[k];
  if(b.stage==='won') patch.won_at=new Date().toISOString();
  if(b.stage==='lost') patch.lost_at=new Date().toISOString();
  const {data,error}=await supabase.from('deals').update(patch).eq('id',id).eq('organization_id',profile.organization_id).select().single();
  if(error) return NextResponse.json({error:error.message},{status:400});
  await supabase.from('deal_activities').insert({organization_id:profile.organization_id,deal_id:id,actor_id:user.id,activity_type:b.stage?'stage_changed':'updated',notes:b.activity_notes||null,metadata:{stage:b.stage}});
  if(b.stage==='won' && data.lead_id){ await supabase.from('leads').update({status:'purchased',updated_at:new Date().toISOString()}).eq('id',data.lead_id); }
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'deal.updated',entity_type:'deal',entity_id:id,metadata:{stage:b.stage||data.stage}});
  return NextResponse.json({data});
}
