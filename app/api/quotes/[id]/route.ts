import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user,profile}=await requireUser();
  if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json();
  const patch:any={updated_at:new Date().toISOString()};
  for(const k of ['status','valid_until','notes','discount_amount','total_amount'])if(b[k]!==undefined)patch[k]=b[k];
  if(b.status==='sent')patch.sent_at=new Date().toISOString();
  if(b.status==='accepted')patch.accepted_at=new Date().toISOString();
  const {data,error}=await supabase.from('quotes').update(patch).eq('id',id).eq('organization_id',profile.organization_id).select().single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(b.status==='accepted'&&data.deal_id)await supabase.from('deals').update({stage:'won',won_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',data.deal_id);

  if(b.status){
    const {data:intents}=await supabase.from('buyer_intents').select('id,evidence,assigned_to,product_query').eq('organization_id',profile.organization_id).contains('evidence',{workflow_quote_id:id}).limit(20);
    for(const intent of intents??[]){
      const evidence=(intent.evidence&&typeof intent.evidence==='object'&&!Array.isArray(intent.evidence))?intent.evidence:{};
      const stage=b.status==='sent'?'quotation_sent':b.status==='accepted'?'awaiting_payment':b.status==='declined'?'quotation_declined':b.status==='expired'?'quotation_expired':b.status==='cancelled'?'quotation_cancelled':evidence.workflow_stage;
      await supabase.from('buyer_intents').update({evidence:{...evidence,workflow_stage:stage,quote_status:b.status},updated_at:new Date().toISOString()}).eq('id',intent.id);
      if(b.status==='accepted'&&intent.assigned_to){
        await supabase.from('notifications').insert({organization_id:profile.organization_id,recipient_id:intent.assigned_to,title:'Buyer accepted quotation',body:`Next: confirm payment for ${intent.product_query}`,type:'buyer_quote_accepted'});
      }
    }
  }

  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'quote.updated',entity_type:'quote',entity_id:id,metadata:{status:b.status||data.status}});
  return NextResponse.json({data});
}
