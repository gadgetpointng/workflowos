import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

function quoteNumber(){ return `Q-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }

export async function GET(){
  const {supabase,user,profile}=await requireUser(); if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data,error}=await supabase.from('quotes').select('*').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(200);
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({data});
}

export async function POST(req:Request){
  const {supabase,user,profile}=await requireUser(); if(!user||!profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json(); const items=Array.isArray(b.items)?b.items:[];
  const computedSubtotal=items.reduce((sum:number,item:any)=>sum+(Number(item.quantity||1)*Number(item.unit_price||0)),0);
  const subtotal=Number(b.subtotal??computedSubtotal); const discount=Number(b.discount_amount||0); const total=Math.max(0,Number(b.total_amount??(subtotal-discount)));
  const {data,error}=await supabase.from('quotes').insert({organization_id:profile.organization_id,deal_id:b.deal_id||null,lead_id:b.lead_id||null,quote_number:b.quote_number||quoteNumber(),currency:b.currency||'NGN',subtotal,discount_amount:discount,total_amount:total,valid_until:b.valid_until||null,notes:b.notes||null,created_by:user.id}).select().single();
  if(error) return NextResponse.json({error:error.message},{status:400});
  if(items.length){ const rows=items.map((i:any)=>({quote_id:data.id,description:i.description||'Item',product_ref:i.product_ref||null,quantity:Number(i.quantity||1),unit_price:Number(i.unit_price||0),line_total:Number(i.quantity||1)*Number(i.unit_price||0)})); const itemResult=await supabase.from('quote_items').insert(rows); if(itemResult.error) return NextResponse.json({error:itemResult.error.message},{status:400}); }
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'quote.created',entity_type:'quote',entity_id:data.id,metadata:{quote_number:data.quote_number,total_amount:data.total_amount}});
  return NextResponse.json({data},{status:201});
}
