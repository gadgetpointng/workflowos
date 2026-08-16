import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { canContactBuyer } from '@/lib/buyers/intelligence';

function quoteNumber(){ return `Q-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }

export async function POST(req: Request){
  const { supabase, user, profile } = await requireUser();
  if(!user || !profile) return NextResponse.json({error:'Unauthorized'},{status:401});
  const b = await req.json();
  if(!b.intent_id || !b.action) return NextResponse.json({error:'intent_id and action are required'},{status:400});
  const {data:intent,error:intentError}=await supabase.from('buyer_intents').select('*').eq('id',b.intent_id).eq('organization_id',profile.organization_id).single();
  if(intentError || !intent) return NextResponse.json({error:'Buyer request not found'},{status:404});

  if(b.action==='add_offer'){
    if(!canManage(profile.role)) return NextResponse.json({error:'Only the owner or a manager can record sourcing offers'},{status:403});
    const sourcePrice=Number(b.source_price||0); const sellingPrice=Number(b.selling_price||0);
    if(!b.title || sourcePrice < 0 || sellingPrice <= 0) return NextResponse.json({error:'Product, supplier cost and selling price are required'},{status:400});
    const profit=sellingPrice-sourcePrice; const margin=sellingPrice>0?(profit/sellingPrice)*100:0;
    const {data:offer,error}=await supabase.from('external_product_offers').insert({organization_id:profile.organization_id,vendor_id:b.vendor_id||null,title:b.title,source_url:b.source_url||null,source_price:sourcePrice,selling_price:sellingPrice,commission_amount:profit,availability:b.availability||'available',metadata:{buyer_intent_id:intent.id,supplier_name:b.supplier_name||null,profit,margin_percent:margin,recorded_by:user.id,notes:b.notes||null}}).select('id,title,source_price,selling_price,availability,metadata,vendor_id').single();
    if(error) return NextResponse.json({error:error.message},{status:400});
    const evidence=(intent.evidence&&typeof intent.evidence==='object'&&!Array.isArray(intent.evidence))?intent.evidence:{};
    await supabase.from('buyer_intents').update({evidence:{...evidence,workflow_stage:'product_found',last_sourcing_offer_id:offer.id},updated_at:new Date().toISOString()}).eq('id',intent.id);
    await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'buyer_intent.sourcing_offer_added',entity_type:'buyer_intent',entity_id:intent.id,metadata:{offer_id:offer.id,source_price:sourcePrice,selling_price:sellingPrice,profit,margin_percent:margin}});
    return NextResponse.json({data:offer},{status:201});
  }

  if(b.action==='create_quote'){
    if(!canManage(profile.role)) return NextResponse.json({error:'Only the owner or a manager can prepare the buyer quote'},{status:403});
    if(!canContactBuyer(intent.consent_status)) return NextResponse.json({error:'Buyer must opt in before a quote can be prepared for direct contact'},{status:409});
    const evidence=(intent.evidence&&typeof intent.evidence==='object'&&!Array.isArray(intent.evidence))?intent.evidence:{};
    if(evidence.workflow_quote_id) return NextResponse.json({data:{quote_id:evidence.workflow_quote_id,existing:true}});
    const {data:offer,error:offerError}=await supabase.from('external_product_offers').select('*').eq('id',b.offer_id).eq('organization_id',profile.organization_id).single();
    if(offerError || !offer || offer.metadata?.buyer_intent_id!==intent.id) return NextResponse.json({error:'Sourcing offer not found for this buyer request'},{status:404});
    let leadId=intent.lead_id as string|null;
    if(!leadId){
      const {data:lead,error:leadError}=await supabase.from('leads').insert({organization_id:profile.organization_id,name:intent.buyer_name||intent.phone||'Buyer opportunity',phone:intent.phone,email:intent.email,source:intent.source,product_interest:intent.product_query,status:'interested',assigned_to:intent.assigned_to,estimated_value:offer.selling_price,notes:`Created from buyer request ${intent.id} for quotation.`}).select('id').single();
      if(leadError) return NextResponse.json({error:leadError.message},{status:400});
      leadId=lead.id;
    }
    const total=Number(offer.selling_price||0);
    const {data:quote,error:quoteError}=await supabase.from('quotes').insert({organization_id:profile.organization_id,lead_id:leadId,quote_number:quoteNumber(),currency:'NGN',subtotal:total,discount_amount:0,total_amount:total,notes:`Buyer request: ${intent.product_query}. Source: ${intent.source}.`,created_by:user.id}).select('id,quote_number,total_amount,status').single();
    if(quoteError) return NextResponse.json({error:quoteError.message},{status:400});
    const itemResult=await supabase.from('quote_items').insert({quote_id:quote.id,description:offer.title,product_ref:offer.external_product_id||null,quantity:1,unit_price:total,line_total:total,metadata:{buyer_intent_id:intent.id,sourcing_offer_id:offer.id,source_price:offer.source_price,profit:Number(offer.selling_price||0)-Number(offer.source_price||0)}});
    if(itemResult.error) return NextResponse.json({error:itemResult.error.message},{status:400});
    await supabase.from('buyer_intents').update({lead_id:leadId,status:'converted',evidence:{...evidence,workflow_stage:'quotation_ready',workflow_quote_id:quote.id,workflow_quote_number:quote.quote_number},updated_at:new Date().toISOString()}).eq('id',intent.id);
    await supabase.from('activity_logs').insert({organization_id:profile.organization_id,actor_id:user.id,action:'buyer_intent.quote_created',entity_type:'buyer_intent',entity_id:intent.id,metadata:{quote_id:quote.id,offer_id:offer.id,total_amount:total}});
    return NextResponse.json({data:{quote_id:quote.id,quote_number:quote.quote_number,total_amount:quote.total_amount}},{status:201});
  }

  return NextResponse.json({error:'Unsupported action'},{status:400});
}
