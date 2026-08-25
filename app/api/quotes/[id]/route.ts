import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createIntegrationCommand } from '@/lib/integrations/commands';

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

  const {data:intents}=await supabase.from('buyer_intents').select('id,evidence,assigned_to,product_query,buyer_name,phone,email').eq('organization_id',profile.organization_id).contains('evidence',{workflow_quote_id:id}).limit(20);

  let commerceCommand:any=null;
  if(b.status==='accepted'){
    const {data:gadgetpoint}=await supabase.from('external_integrations').select('id,status,capabilities').eq('organization_id',profile.organization_id).eq('slug','gadgetpoint').maybeSingle();
    if(gadgetpoint?.id){
      const idempotencyKey=`quote:${id}:order.create`;
      const {data:existingCommand}=await supabase.from('integration_commands').select('*').eq('organization_id',profile.organization_id).eq('integration_id',gadgetpoint.id).eq('idempotency_key',idempotencyKey).maybeSingle();
      if(existingCommand){
        commerceCommand=existingCommand;
      }else{
        const {data:items}=await supabase.from('quote_items').select('id,description,product_ref,quantity,unit_price,line_total').eq('quote_id',id).order('id',{ascending:true});
        try{
          commerceCommand=await createIntegrationCommand({
            organizationId:profile.organization_id,
            integrationId:gadgetpoint.id,
            commandType:'order.create',
            targetEntityType:'quote',
            targetEntityId:id,
            requestedBy:user.id,
            idempotencyKey,
            payload:{
              workflow_quote_id:id,
              quote_number:data.quote_number,
              currency:data.currency||'NGN',
              subtotal:data.subtotal,
              discount_amount:data.discount_amount,
              total_amount:data.total_amount,
              lead_id:data.lead_id||null,
              deal_id:data.deal_id||null,
              buyer_intent_ids:(intents??[]).map((intent:any)=>intent.id),
              customer:(intents??[])[0]?{
                name:(intents??[])[0].buyer_name||null,
                phone:(intents??[])[0].phone||null,
                email:(intents??[])[0].email||null,
              }:null,
              items:items??[],
              source:'workflowos_quote',
            },
          });
        }catch(commandError:any){
          await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'quote.order_request_failed',entity_type:'quote',entity_id:id,metadata:{error:commandError?.message||'Could not create GadgetPoint order request'}});
        }
      }
    }
  }

  if(b.status){
    for(const intent of intents??[]){
      const evidence=(intent.evidence&&typeof intent.evidence==='object'&&!Array.isArray(intent.evidence))?intent.evidence:{};
      const stage=b.status==='sent'?'quotation_sent':b.status==='accepted'?(commerceCommand?'order_requested':'awaiting_payment'):b.status==='declined'?'quotation_declined':b.status==='expired'?'quotation_expired':b.status==='cancelled'?'quotation_cancelled':evidence.workflow_stage;
      await supabase.from('buyer_intents').update({evidence:{...evidence,workflow_stage:stage,quote_status:b.status,...(commerceCommand?{commerce_command_id:commerceCommand.id,commerce_command_status:commerceCommand.status}: {})},updated_at:new Date().toISOString()}).eq('id',intent.id);
      if(b.status==='accepted'&&intent.assigned_to){
        await supabase.from('notifications').insert({organization_id:profile.organization_id,recipient_id:intent.assigned_to,title:'Buyer accepted quotation',body:commerceCommand?`GadgetPoint order request created for ${intent.product_query}`:`Next: confirm payment for ${intent.product_query}`,type:'buyer_quote_accepted'});
      }
    }
  }

  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'quote.updated',entity_type:'quote',entity_id:id,metadata:{status:b.status||data.status,commerce_command_id:commerceCommand?.id||null}});
  return NextResponse.json({data,commerce_command:commerceCommand});
}
