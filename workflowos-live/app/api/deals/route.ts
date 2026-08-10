import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function GET(){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data,error}=await supabase.from('deals').select('*').eq('organization_id',profile.organization_id).order('updated_at',{ascending:false}).limit(200);
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({data});
}

export async function POST(req:Request){
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json();
  if(!b.title) return NextResponse.json({error:'title is required'},{status:400});
  const payload={organization_id:profile.organization_id,lead_id:b.lead_id||null,title:b.title,owner_id:b.owner_id||user.id,stage:b.stage||'qualified',amount:Number(b.amount||0),currency:b.currency||'NGN',probability:Number(b.probability??25),expected_close_at:b.expected_close_at||null,source:b.source||null,product_interest:b.product_interest||null,notes:b.notes||null};
  const {data,error}=await supabase.from('deals').insert(payload).select().single();
  if(error) return NextResponse.json({error:error.message},{status:400});
  await supabase.from('deal_activities').insert({organization_id:profile.organization_id,deal_id:data.id,actor_id:user.id,activity_type:'created',notes:'Deal created'});
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'deal.created',entity_type:'deal',entity_id:data.id,metadata:{title:data.title,amount:data.amount}});
  return NextResponse.json({data},{status:201});
}
