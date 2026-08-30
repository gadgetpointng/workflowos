import { NextResponse } from 'next/server';
import { authenticateBridge, recordIntegrationEvent, type BridgeEvent } from '@/lib/integrations/bridge';
import { runAutomationsForBridgeEvent } from '@/lib/automation/engine';
import { resolveCustomer, refreshCustomerCommerce } from '@/lib/customers';
import { domainForEvent } from '@/lib/integrations/ownership';
import { canPublishEvents } from '@/lib/integrations/capabilities';
import { matchProducts, scoreBuyerIntent } from '@/lib/buyers/intelligence';
import { recoverLeadAfterUniqueConflict } from '@/lib/buyers/lead-identity';
import { evaluateStorefrontSignal } from '@/lib/growth/storefront-intelligence';


function observeBridgeReadFailure(operation:string, error:any) {
  if (error) console.error('Generic bridge read failed', { operation, code: error.code });
}

async function connectedProductsFor(supabase:any, orgId:string) {
  const { data, error: connectedProductsError } = await supabase.from('connected_products').select('id,external_product_id,name,category,price,stock_quantity,active,sku,metadata').eq('organization_id',orgId).eq('active',true).limit(500);
  observeBridgeReadFailure('connected_products.select.buyer_matching', connectedProductsError);
  return data ?? [];
}

async function recommendSalesAssignee(supabase:any, orgId:string) {
  const { data:caps, error: salesCapabilitiesError } = await supabase.from('staff_capabilities').select('profile_id,proficiency,profiles(active)').eq('organization_id',orgId).eq('capability','sales').eq('active',true).order('proficiency',{ascending:false}).limit(20);
  observeBridgeReadFailure('staff_capabilities.select.sales_assignee', salesCapabilitiesError);
  const ids=(caps??[]).filter((x:any)=>x.profiles?.active!==false).map((x:any)=>x.profile_id);
  if(!ids.length) return null;
  const { data:open, error: salesTaskLoadError } = await supabase.from('tasks').select('assignee_id,status').eq('organization_id',orgId).in('assignee_id',ids).not('status','in','("completed","cancelled")');
  observeBridgeReadFailure('tasks.select.sales_assignee_load', salesTaskLoadError);
  const load=new Map<string,number>(); for(const t of open??[]) load.set(t.assignee_id,(load.get(t.assignee_id)||0)+1);
  return [...ids].sort((a,b)=>(load.get(a)||0)-(load.get(b)||0))[0] ?? null;
}

function normalizeRole(role?: string) {
  const allowed = new Set(['owner','admin','manager','marketing','sales','staff']);
  return allowed.has(role ?? '') ? role : 'staff';
}

export async function POST(request: Request, context: { params: Promise<{ integration: string }> }) {
  const { integration: slug } = await context.params;
  const auth = await authenticateBridge(request, slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let event: BridgeEvent;
  try { event = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!event.type) return NextResponse.json({ error: 'Event type is required' }, { status: 400 });

  const { supabase, integration } = auth;
  if (!canPublishEvents(integration.capabilities)) return NextResponse.json({ error: 'Integration is not permitted to publish events' }, { status: 403 });
  const orgId = integration.organization_id;
  const ownershipDomain = domainForEvent(event.type);
  event = { ...event, data: { ...(event.data ?? {}), _workflowos: { ownership_domain: ownershipDomain, source_system: slug, mirror_only: ['products','inventory','orders','payments','shopping_experience'].includes(ownershipDomain) } } };
  const tracked = await recordIntegrationEvent({ supabase, organizationId: orgId, integrationId: integration.id, source: slug, event });
  if (tracked.duplicate) return NextResponse.json({ ok: true, duplicate: true, event_id: tracked.eventId });

  const d = event.data ?? {};
  let result: Record<string, any> = {};

  if (event.type === 'site.heartbeat') {
    const siteName = String(d.name ?? d.site_name ?? slug);
    const siteSlug = String(d.slug ?? slug).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const { data: site, error: siteHeartbeatError } = await supabase.from('connected_sites').upsert({
      organization_id: orgId,
      integration_id: integration.id,
      name: siteName,
      slug: siteSlug,
      site_type: d.site_type ?? 'commerce',
      domain: d.domain ?? null,
      status: 'active',
      capabilities: d.capabilities ?? integration.capabilities ?? ['events'],
      metadata: { ...(d.metadata ?? {}), last_heartbeat_at: event.occurred_at ?? new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: 'organization_id,slug' }).select().single();
    if (siteHeartbeatError) {
      console.error('Generic bridge critical write failed', { operation: 'connected_sites.upsert.site_heartbeat', code: siteHeartbeatError.code });
      return NextResponse.json({ error: 'Site heartbeat sync failed' }, { status: 400 });
    }
    result = { site };
  }

  if (event.type === 'staff.upsert') {
    if (!d.id || !d.email) return NextResponse.json({ error: 'staff.upsert requires data.id and data.email' }, { status: 400 });
    const { data, error: staffUpsertError } = await supabase.from('connected_staff').upsert({
      organization_id: orgId,
      integration_id: integration.id,
      external_staff_id: String(d.id),
      email: String(d.email).toLowerCase(),
      full_name: d.full_name ?? d.name ?? d.email,
      role: normalizeRole(d.role),
      department: d.department ?? null,
      status: d.active === false ? 'inactive' : 'active',
      metadata: d.metadata ?? {},
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'integration_id,external_staff_id' }).select().single();
    if (staffUpsertError) {
      console.error('Generic bridge critical write failed', { operation: 'connected_staff.upsert.staff', code: staffUpsertError.code });
      return NextResponse.json({ error: 'Staff sync failed' }, { status: 400 });
    }
    result = { staff: data };
  }

  if (event.type === 'product.upsert' || event.type === 'inventory.updated') {
    if (!d.id) return NextResponse.json({ error: `${event.type} requires data.id` }, { status: 400 });
    const { data, error } = await supabase.from('connected_products').upsert({
      organization_id: orgId,
      integration_id: integration.id,
      external_product_id: String(d.id),
      sku: d.sku ?? null,
      name: d.name ?? d.title ?? 'Unnamed product',
      category: d.category ?? null,
      price: d.price ?? null,
      cost_price: d.cost_price ?? null,
      stock_quantity: d.stock_quantity ?? d.quantity ?? null,
      active: d.active !== false,
      metadata: d.metadata ?? {},
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'integration_id,external_product_id' }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    result = { product: data };

    if (event.type === 'inventory.updated' && Number(d.stock_quantity ?? d.quantity) <= Number(d.low_stock_threshold ?? 3)) {
      const { error: lowStockOpportunityError } = await supabase.from('growth_opportunities').insert({
        organization_id: orgId,
        title: `Low stock: ${d.name ?? d.title ?? d.id}`,
        summary: `Connected inventory reported ${d.stock_quantity ?? d.quantity ?? 0} units remaining.`,
        source: slug,
        opportunity_type: 'inventory_risk',
        score: 88,
        product_ref: String(d.id),
        recommended_action: 'Review stock and create a restock task.',
        evidence: { event_id: event.id ?? null, stock_quantity: d.stock_quantity ?? d.quantity }
      });
      if (lowStockOpportunityError) console.error('Generic bridge growth opportunity write failed', { operation: 'growth_opportunities.insert.low_stock', code: lowStockOpportunityError.code });
    }
  }
  if (event.type === 'order.created' || event.type === 'order.updated') {
    if (!d.id) return NextResponse.json({ error: `${event.type} requires data.id` }, { status: 400 });
    const customer = await resolveCustomer(supabase, orgId, { name:d.customer_name ?? d.customer?.name ?? null, email:d.customer_email ?? d.customer?.email ?? null, phone:d.customer_phone ?? d.customer?.phone ?? null, source:d.channel ?? slug, lifecycle:'customer' });
    const { data, error } = await supabase.from('connected_orders').upsert({
      organization_id: orgId,
      integration_id: integration.id,
      external_order_id: String(d.id),
      customer_id: customer?.id ?? null,
      customer_name: d.customer_name ?? d.customer?.name ?? null,
      customer_email: d.customer_email ?? d.customer?.email ?? null,
      customer_phone: d.customer_phone ?? d.customer?.phone ?? null,
      status: d.status ?? 'new',
      total_amount: d.total_amount ?? d.total ?? null,
      currency: d.currency ?? 'NGN',
      channel: d.channel ?? slug,
      items: d.items ?? [],
      metadata: d.metadata ?? {},
      ordered_at: d.ordered_at ?? event.occurred_at ?? new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'integration_id,external_order_id' }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { error: orderSignalError } = await supabase.from('commerce_signals').insert({
      organization_id: orgId,
      integration_id: integration.id,
      source: slug,
      signal_type: 'order',
      value: d.total_amount ?? d.total ?? null,
      metadata: { external_order_id: d.id, channel: d.channel ?? slug },
      observed_at: event.occurred_at ?? new Date().toISOString()
    });
    if (orderSignalError) console.error('Generic bridge commerce signal write failed', { operation: 'commerce_signals.insert.order', code: orderSignalError.code });
    if (customer?.id) await refreshCustomerCommerce(supabase, customer.id);
    result = { order: data, customer_id: customer?.id ?? null };
  }

  if (['storefront.search','product.view','cart.added','marketplace.demand'].includes(event.type)) {
    const signalType = event.type.replace('.', '_');
    const { data, error } = await supabase.from('commerce_signals').insert({
      organization_id: orgId,
      integration_id: integration.id,
      source: slug,
      signal_type: signalType,
      product_ref: d.product_id ? String(d.product_id) : null,
      search_query: d.query ?? d.search_query ?? null,
      quantity: d.quantity ?? 1,
      value: d.value ?? d.price ?? null,
      metadata: d.metadata ?? {},
      observed_at: event.occurred_at ?? new Date().toISOString()
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    result = { signal: data };

    if (event.type !== 'marketplace.demand') {
      try {
        const intelligence = await evaluateStorefrontSignal({
          supabase,
          organizationId: orgId,
          source: slug,
          event,
          integrationEventId: tracked.eventId,
        });
        if (intelligence) result = { ...result, storefront_intelligence: intelligence };
      } catch (intelligenceError: any) {
        const intelligenceFailureCode = typeof intelligenceError?.code === 'string' && intelligenceError.code
          ? intelligenceError.code
          : 'storefront_intelligence_failed';
        const { error: storefrontIntelligenceActivityError } = await supabase.from('activity_logs').insert({
          organization_id: orgId,
          actor_id: null,
          action: 'storefront.intelligence.failed',
          entity_type: 'integration_event',
          entity_id: tracked.eventId,
          metadata: {
            event_type: event.type,
            source: slug,
            error_code: intelligenceFailureCode,
          },
        });
        if (storefrontIntelligenceActivityError) console.error('Generic bridge activity log write failed', { operation: 'activity_logs.insert.storefront_intelligence_failure', code: storefrontIntelligenceActivityError.code });
      }
    }

    if (event.type === 'marketplace.demand' && (d.query || d.search_query || d.product_interest)) {
      const input:any = { product_query:d.product_interest ?? d.query ?? d.search_query, category:d.category ?? null, brand:d.brand ?? null, model:d.model ?? null, budget_min:d.budget_min ?? null, budget_max:d.budget_max ?? d.value ?? null, state:d.state ?? null, city:d.city ?? null, urgency:d.urgency ?? 'normal', source:slug, consent_status:'public_signal' };
      const products=await connectedProductsFor(supabase,orgId); const matches=matchProducts(input,products); const score=scoreBuyerIntent(input);
      const { data:intent, error:marketplaceBuyerIntentError } = await supabase.from('buyer_intents').upsert({ organization_id:orgId, source:slug, external_ref:event.id ?? null, product_query:input.product_query, category:input.category, brand:input.brand, model:input.model, budget_min:input.budget_min, budget_max:input.budget_max, state:input.state, city:input.city, urgency:input.urgency, consent_status:'public_signal', intent_score:score, status:matches.length?'matched':'new', matched_products:matches, evidence:{integration_event_id:tracked.eventId, public_signal:true} },{onConflict:'organization_id,source,external_ref'}).select().maybeSingle();
      if (marketplaceBuyerIntentError) console.error('Generic bridge buyer workflow write failed', { operation: 'buyer_intents.upsert', code: marketplaceBuyerIntentError.code });
      result = { ...result, buyer_intent:intent };
    }
  }

  if (event.type === 'vendor.order.created') {
    if (!d.vendor_id || !d.offer_id) return NextResponse.json({ error: 'vendor.order.created requires data.vendor_id and data.offer_id' }, { status: 400 });
    const { data: offer, error: offerError } = await supabase.from('external_product_offers').select('id,vendor_id,title,source_price,selling_price,commission_amount').eq('organization_id',orgId).eq('id',d.offer_id).eq('vendor_id',d.vendor_id).single();
    if (offerError || !offer) return NextResponse.json({ error: 'Vendor offer not found' }, { status: 404 });
    const qty = Math.max(1, Number(d.quantity ?? 1));
    const selling = Number(d.unit_selling_price ?? offer.selling_price ?? 0);
    const sourcePrice = Number(d.unit_vendor_price ?? offer.source_price ?? 0);
    const gross = selling * qty;
    const vendorAmount = sourcePrice * qty;
    const commission = Math.max(0, gross - vendorAmount);
    const { data: vendorOrder, error } = await supabase.from('vendor_orders').insert({
      organization_id: orgId,
      vendor_id: d.vendor_id,
      external_product_offer_id: offer.id,
      quantity: qty,
      gross_amount: gross,
      commission_amount: commission,
      vendor_amount: vendorAmount,
      currency: d.currency ?? 'NGN',
      status: d.status ?? 'confirmed',
      metadata: { external_order_id: d.external_order_id ?? null, source: slug, product_title: offer.title, ...(d.metadata ?? {}) }
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { error: vendorAnalyticsError } = await supabase.from('analytics_events').insert({ organization_id: orgId, event_type: 'vendor_sale', source: slug, entity_type: 'vendor_order', entity_id: vendorOrder.id, amount: gross, currency: d.currency ?? 'NGN', metadata: { commission_amount: commission, vendor_amount: vendorAmount, vendor_id: d.vendor_id } });
    if (vendorAnalyticsError) console.error('Generic bridge analytics write failed', { operation: 'analytics_events.insert.vendor_sale', code: vendorAnalyticsError.code });
    result = { vendor_order: vendorOrder, commission_amount: commission, vendor_amount: vendorAmount };
  }

  if (event.type === 'whatsapp.inquiry') {
    const phone = d.phone ?? d.customer_phone;
    if (!phone) return NextResponse.json({ error: 'whatsapp.inquiry requires data.phone' }, { status: 400 });
    const customer = await resolveCustomer(supabase, orgId, { name:d.name ?? null, phone, email:d.email ?? null, source:'whatsapp', lifecycle:'prospect' });
    const { data: existing, error: whatsappLeadLookupError } = await supabase.from('leads').select('id').eq('organization_id', orgId).eq('phone', phone).maybeSingle();
    observeBridgeReadFailure('leads.select.whatsapp_existing', whatsappLeadLookupError);
    let leadId = existing?.id;
    if (leadId) {
      const { error: leadRefreshError } = await supabase.from('leads').update({
        name: d.name ?? undefined,
        product_interest: d.product_interest ?? undefined,
        source: 'whatsapp',
        status: 'new',
        notes: d.message ?? undefined,
        customer_id: customer?.id ?? undefined,
        updated_at: new Date().toISOString()
      }).eq('id', leadId).eq('organization_id', orgId);
      if (leadRefreshError) console.error('Generic bridge buyer workflow write failed', { operation: 'leads.update.whatsapp_refresh', code: leadRefreshError.code });
    } else {
      const { data: lead, error: whatsappLeadInsertError } = await supabase.from('leads').insert({
        organization_id: orgId,
        name: d.name ?? phone,
        phone,
        email: d.email ?? null,
        source: 'whatsapp',
        product_interest: d.product_interest ?? null,
        status: 'new',
        notes: d.message ?? null,
        customer_id: customer?.id ?? null
      }).select().single();
      if (whatsappLeadInsertError) console.error('Generic bridge buyer workflow write failed', { operation: 'leads.insert.whatsapp', code: whatsappLeadInsertError.code });
      leadId = lead?.id ?? (whatsappLeadInsertError ? await recoverLeadAfterUniqueConflict(supabase, orgId, { phone, email: d.email ?? null }, whatsappLeadInsertError) : null);
    }
    const { data: conversation, error: conversationError } = await supabase.from('customer_conversations').insert({
      organization_id: orgId,
      integration_id: integration.id,
      channel: 'whatsapp',
      external_conversation_id: d.conversation_id ?? null,
      customer_name: d.name ?? null,
      customer_phone: phone,
      customer_email: d.email ?? null,
      lead_id: leadId,
      customer_id: customer?.id ?? null,
      subject: d.product_interest ?? 'WhatsApp inquiry',
      last_message: d.message ?? null,
      status: 'open',
      metadata: d.metadata ?? {}
    }).select().single();
    if (conversationError) console.error('Generic bridge buyer workflow write failed', { operation: 'customer_conversations.insert', code: conversationError.code });
    const assigneeId = await recommendSalesAssignee(supabase, orgId);
    if (assigneeId && leadId) {
      const { error: leadAssignmentError } = await supabase.from('leads').update({assigned_to:assigneeId}).eq('id',leadId).eq('organization_id', orgId);
      if (leadAssignmentError) console.error('Generic bridge buyer workflow write failed', { operation: 'leads.update.whatsapp_assignment', code: leadAssignmentError.code });
    }
    const productQuery=d.product_interest ?? d.message ?? 'WhatsApp product inquiry';
    const intentInput:any={product_query:productQuery,category:d.category??null,brand:d.brand??null,model:d.model??null,budget_min:d.budget_min??null,budget_max:d.budget_max??null,state:d.state??null,city:d.city??null,urgency:d.urgent?'high':(d.urgency??'normal'),source:'whatsapp',consent_status:'opted_in'};
    const products=await connectedProductsFor(supabase,orgId); const matches=matchProducts(intentInput,products); const intentScore=scoreBuyerIntent(intentInput);
    const { data:buyerIntent, error:buyerIntentError } = await supabase.from('buyer_intents').upsert({organization_id:orgId,source:'whatsapp',external_ref:event.id ?? d.message_id ?? d.conversation_id ?? null,buyer_name:d.name??null,phone,email:d.email??null,product_query:productQuery,category:intentInput.category,brand:intentInput.brand,model:intentInput.model,budget_min:intentInput.budget_min,budget_max:intentInput.budget_max,state:intentInput.state,city:intentInput.city,urgency:intentInput.urgency,consent_status:'opted_in',intent_score:intentScore,status:matches.length?'matched':'qualified',assigned_to:assigneeId,lead_id:leadId,matched_products:matches,evidence:{integration_event_id:tracked.eventId,message:d.message??null}}, {onConflict:'organization_id,source,external_ref'}).select().maybeSingle();
    if (buyerIntentError) console.error('Generic bridge buyer workflow write failed', { operation: 'buyer_intents.upsert', code: buyerIntentError.code });
    const { data: task, error: taskError } = await supabase.from('tasks').insert({
      organization_id: orgId,
      title: `Follow up WhatsApp lead: ${d.name ?? phone}`,
      description: `${d.message ?? `Customer inquiry${d.product_interest ? ` about ${d.product_interest}` : ''}.`}${matches[0]?`\nTop product match: ${matches[0].name}${matches[0].price?` — NGN ${matches[0].price}`:''}`:''}`,
      department: 'sales',
      priority: d.urgent ? 'high' : 'medium',
      status: assigneeId ? 'assigned' : 'open',
      assignee_id: assigneeId
    }).select().single();
    if (taskError) console.error('Generic bridge buyer workflow write failed', { operation: 'tasks.insert', code: taskError.code });
    result = { lead_id: leadId, buyer_intent:buyerIntent, product_matches:matches, assigned_to:assigneeId, conversation, task };
  }


  if (event.type === 'meta.lead' || event.type === 'tiktok.lead') {
    const source = event.type === 'meta.lead' ? 'facebook' : 'tiktok';
    const phone = d.phone ?? d.customer_phone ?? null;
    const email = d.email ?? d.customer_email ?? null;
    if (!phone && !email) return NextResponse.json({ error: `${event.type} requires data.phone or data.email` }, { status: 400 });
    const productQuery = d.product_interest ?? d.product_name ?? d.message ?? d.form_answer ?? 'General product enquiry';
    const consent = d.consent_status === 'do_not_contact' ? 'do_not_contact' : (d.consent === false ? 'unknown' : 'opted_in');
    const customer = await resolveCustomer(supabase, orgId, { name:d.name ?? d.customer_name ?? null, phone, email, source, lifecycle:'prospect' });
    let existing:any = null;
    if (phone) {
      const { data: phoneExisting, error: acquisitionPhoneLeadLookupError } = await supabase.from('leads').select('id').eq('organization_id',orgId).eq('phone',phone).maybeSingle();
      observeBridgeReadFailure('leads.select.acquisition_phone_existing', acquisitionPhoneLeadLookupError);
      existing = phoneExisting;
    }
    if (!existing && email) {
      const { data: emailExisting, error: acquisitionEmailLeadLookupError } = await supabase.from('leads').select('id').eq('organization_id',orgId).eq('email',String(email).toLowerCase()).maybeSingle();
      observeBridgeReadFailure('leads.select.acquisition_email_existing', acquisitionEmailLeadLookupError);
      existing = emailExisting;
    }
    const assigneeId = await recommendSalesAssignee(supabase, orgId);
    let leadId=existing?.id ?? null;
    if (leadId) {
      const { error: acquisitionLeadUpdateError } = await supabase.from('leads').update({name:d.name ?? d.customer_name ?? undefined,phone:phone ?? undefined,email:email ?? undefined,source,product_interest:productQuery,status:'new',assigned_to:assigneeId ?? undefined,customer_id:customer?.id ?? undefined,notes:d.message ?? d.form_answer ?? undefined,updated_at:new Date().toISOString()}).eq('id',leadId).eq('organization_id',orgId);
      if (acquisitionLeadUpdateError) console.error('Generic bridge buyer workflow write failed', { operation: 'leads.update.acquisition_refresh', code: acquisitionLeadUpdateError.code });
    } else {
      const {data:lead,error:acquisitionLeadInsertError}=await supabase.from('leads').insert({organization_id:orgId,name:d.name ?? d.customer_name ?? phone ?? email ?? `${source} lead`,phone,email,source,product_interest:productQuery,status:'new',assigned_to:assigneeId,customer_id:customer?.id ?? null,notes:d.message ?? d.form_answer ?? null}).select().single();
      if(acquisitionLeadInsertError) console.error('Generic bridge buyer workflow write failed', { operation: 'leads.insert.acquisition', code: acquisitionLeadInsertError.code });
      leadId=lead?.id ?? (acquisitionLeadInsertError ? await recoverLeadAfterUniqueConflict(supabase, orgId, { phone, email }, acquisitionLeadInsertError) : null);
    }
    const intentInput:any={product_query:productQuery,category:d.category??null,brand:d.brand??null,model:d.model??null,budget_min:d.budget_min??null,budget_max:d.budget_max??d.estimated_value??null,state:d.state??null,city:d.city??null,urgency:d.urgency??'normal',source,consent_status:consent};
    const products=await connectedProductsFor(supabase,orgId); const matches=matchProducts(intentInput,products); const intentScore=scoreBuyerIntent(intentInput);
    const {data:buyerIntent,error:buyerIntentError}=await supabase.from('buyer_intents').upsert({organization_id:orgId,source,external_ref:event.id ?? d.lead_id ?? d.external_id ?? null,buyer_name:d.name??d.customer_name??null,phone,email,product_query:productQuery,category:intentInput.category,brand:intentInput.brand,model:intentInput.model,budget_min:intentInput.budget_min,budget_max:intentInput.budget_max,state:intentInput.state,city:intentInput.city,urgency:intentInput.urgency,consent_status:consent,intent_score:intentScore,status:matches.length?'matched':'qualified',assigned_to:assigneeId,lead_id:leadId,matched_products:matches,evidence:{integration_event_id:tracked.eventId,campaign_id:d.campaign_id??null,ad_id:d.ad_id??null,adset_id:d.adset_id??null,form_id:d.form_id??null}}, {onConflict:'organization_id,source,external_ref'}).select().maybeSingle();
    if (buyerIntentError) console.error('Generic bridge buyer workflow write failed', { operation: 'buyer_intents.upsert', code: buyerIntentError.code });
    const { error: acquisitionAnalyticsError } = await supabase.from('analytics_events').insert({organization_id:orgId,event_type:'acquisition_lead',source,entity_type:'lead',entity_id:leadId,amount:d.estimated_value??d.budget_max??null,currency:d.currency??'NGN',metadata:{campaign_id:d.campaign_id??null,ad_id:d.ad_id??null,adset_id:d.adset_id??null,form_id:d.form_id??null,platform:event.type}});
    if (acquisitionAnalyticsError) console.error('Generic bridge analytics write failed', { operation: 'analytics_events.insert.acquisition_lead', code: acquisitionAnalyticsError.code });
    let task:any=null;
    if (consent === 'opted_in') {
      const {data:t,error:taskError}=await supabase.from('tasks').insert({organization_id:orgId,title:`Follow up ${source === 'facebook' ? 'Meta' : 'TikTok'} buyer: ${d.name ?? phone ?? email}`,description:`Buyer asked about ${productQuery}.${matches[0]?` Top GadgetPoint match: ${matches[0].name}${matches[0].price?` — NGN ${matches[0].price}`:''}.`:''}`,department:'sales',priority:intentScore>=80?'high':'medium',status:assigneeId?'assigned':'open',assignee_id:assigneeId}).select().single();
      if (taskError) console.error('Generic bridge buyer workflow write failed', { operation: 'tasks.insert', code: taskError.code });
      task=t;
    }
    result={lead_id:leadId,buyer_intent:buyerIntent,product_matches:matches,assigned_to:assigneeId,task,source};
  }

  if (event.type === 'social.engagement' || event.type === 'campaign.attribution') {
    const source = String(d.platform ?? slug ?? 'social').toLowerCase();
    const {data:analytics,error}=await supabase.from('analytics_events').insert({organization_id:orgId,event_type:event.type.replace('.','_'),source,entity_type:d.entity_type??'campaign',entity_id:d.entity_id??d.campaign_id??null,amount:d.revenue??d.value??null,currency:d.currency??'NGN',metadata:{campaign_id:d.campaign_id??null,ad_id:d.ad_id??null,clicks:d.clicks??null,views:d.views??null,engagements:d.engagements??null,conversions:d.conversions??null,...(d.metadata??{})}}).select().single();
    if(error) return NextResponse.json({error:error.message},{status:400});
    result={analytics};
  }

  const automations = await runAutomationsForBridgeEvent({ supabase, organizationId: orgId, source: slug, event, sourceEntityId: event.data?.id ? String(event.data.id) : null });
  const { error: integrationSyncError } = await supabase.from('external_integrations').update({ last_synced_at: new Date().toISOString(), status: 'connected' }).eq('id', integration.id).eq('organization_id', orgId);
  if (integrationSyncError) console.error('Generic bridge sync write failed', { operation: 'external_integrations.update', code: integrationSyncError.code });
  return NextResponse.json({ ok: true, event_id: tracked.eventId, automations, ...result });
}
