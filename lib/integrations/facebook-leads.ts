import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCustomer } from '@/lib/customers';

type LeadgenValue = {
  leadgen_id?: string;
  page_id?: string;
  form_id?: string;
  ad_id?: string;
  created_time?: number;
};

type MetaLead = {
  id?: string;
  created_time?: string;
  ad_id?: string;
  form_id?: string;
  field_data?: Array<{ name?: string; values?: unknown[] }>;
};

export function facebookLeadEnvStatus() {
  return {
    verifyToken: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    appSecret: Boolean(process.env.META_APP_SECRET),
    pageAccessToken: Boolean(process.env.META_PAGE_ACCESS_TOKEN),
    graphVersion: Boolean(process.env.META_GRAPH_VERSION),
  };
}

export function facebookLeadEnvReady() {
  return Object.values(facebookLeadEnvStatus()).every(Boolean);
}

export function verifyMetaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function textValue(map: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = map[name]?.trim();
    if (value) return value;
  }
  return null;
}

function normalizeFieldData(fieldData: MetaLead['field_data']) {
  const map: Record<string, string> = {};
  for (const field of fieldData ?? []) {
    const name = String(field.name ?? '').trim().toLowerCase();
    if (!name) continue;
    map[name] = (field.values ?? []).map(value => String(value ?? '').trim()).filter(Boolean).join(', ');
  }
  const fallbackName = [map.first_name, map.last_name].filter(Boolean).join(' ').trim();
  const fullName = textValue(map, ['full_name', 'name']) ?? (fallbackName || null);
  return {
    map,
    name: fullName,
    phone: textValue(map, ['phone_number', 'phone', 'mobile_number', 'mobile']),
    email: textValue(map, ['email']),
    productInterest: textValue(map, [
      'product_interest',
      'product',
      'model',
      'what_product_are_you_interested_in',
      'what_are_you_interested_in',
    ]),
  };
}

async function fetchMetaLead(leadId: string): Promise<MetaLead> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_VERSION;
  if (!token || !version) throw new Error('Meta Graph credentials are not configured');
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(leadId)}`);
  url.searchParams.set('fields', 'id,created_time,ad_id,form_id,field_data');
  url.searchParams.set('access_token', token);
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Meta Graph returned ${response.status}`);
  return body as MetaLead;
}

export async function ingestFacebookLead(value: LeadgenValue, rawPayload: unknown) {
  const externalLeadId = String(value.leadgen_id ?? '').trim();
  const pageId = String(value.page_id ?? '').trim();
  if (!externalLeadId || !pageId) return { ok: false, skipped: true, reason: 'missing leadgen_id or page_id' };

  const admin = createAdminClient();
  const { data: integration, error: integrationError } = await admin
    .from('external_integrations')
    .select('id,organization_id,status,settings')
    .eq('slug', 'facebook-leads')
    .eq('external_account_ref', pageId)
    .maybeSingle();
  if (integrationError) throw integrationError;
  if (!integration || integration.status !== 'connected') return { ok: false, skipped: true, reason: 'page is not connected' };

  const { data: existing } = await admin
    .from('facebook_lead_events')
    .select('id,status,lead_id')
    .eq('organization_id', integration.organization_id)
    .eq('external_lead_id', externalLeadId)
    .maybeSingle();
  if (existing?.status === 'processed') return { ok: true, duplicate: true, leadId: existing.lead_id };

  const eventPayload = {
    organization_id: integration.organization_id,
    integration_id: integration.id,
    external_lead_id: externalLeadId,
    page_id: pageId,
    form_id: value.form_id ?? null,
    ad_id: value.ad_id ?? null,
    status: 'pending',
    raw_payload: rawPayload ?? {},
    error: null,
    processed_at: null,
  };
  const { data: event, error: eventError } = await admin
    .from('facebook_lead_events')
    .upsert(eventPayload, { onConflict: 'organization_id,external_lead_id' })
    .select('id')
    .single();
  if (eventError || !event) throw eventError || new Error('Could not record Facebook lead event');

  try {
    const metaLead = await fetchMetaLead(externalLeadId);
    const normalized = normalizeFieldData(metaLead.field_data);
    if (!normalized.name && !normalized.phone && !normalized.email) throw new Error('Facebook lead has no usable contact details');

    const settings = (integration.settings ?? {}) as Record<string, unknown>;
    const defaultAssigneeId = typeof settings.default_assignee_id === 'string' ? settings.default_assignee_id : null;
    const followupMinutesRaw = Number(settings.followup_minutes ?? 15);
    const followupMinutes = Number.isFinite(followupMinutesRaw) ? Math.min(Math.max(Math.round(followupMinutesRaw), 1), 10080) : 15;
    const now = new Date();
    const nextFollowupAt = new Date(now.getTime() + followupMinutes * 60_000).toISOString();
    const productInterest = normalized.productInterest || `Facebook lead${metaLead.ad_id || value.ad_id ? ` · Ad ${metaLead.ad_id || value.ad_id}` : ''}`;
    const metadataNotes = [
      `Facebook Lead ID: ${externalLeadId}`,
      `Page ID: ${pageId}`,
      `Form ID: ${metaLead.form_id || value.form_id || 'unknown'}`,
      `Ad ID: ${metaLead.ad_id || value.ad_id || 'unknown'}`,
      `Captured fields: ${JSON.stringify(normalized.map)}`,
    ].join('\n');

    const customer = await resolveCustomer(admin, integration.organization_id, {
      name: normalized.name,
      phone: normalized.phone,
      email: normalized.email,
      source: 'facebook',
      lifecycle: 'prospect',
    });

    const { data: lead, error: leadError } = await admin
      .from('leads')
      .insert({
        organization_id: integration.organization_id,
        customer_id: customer?.id ?? null,
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email,
        source: 'facebook',
        product_interest: productInterest,
        status: 'new',
        assigned_to: defaultAssigneeId,
        next_followup_at: nextFollowupAt,
        notes: metadataNotes,
      })
      .select('id')
      .single();
    if (leadError || !lead) throw leadError || new Error('Could not create WorkflowOS lead');

    await admin.from('lead_activities').insert({
      lead_id: lead.id,
      actor_id: null,
      activity_type: 'created',
      notes: `Automatically captured from Facebook Lead Ads. Follow-up due in ${followupMinutes} minutes.`,
    });

    let recipientId = defaultAssigneeId;
    if (!recipientId) {
      const { data: owner } = await admin
        .from('profiles')
        .select('id')
        .eq('organization_id', integration.organization_id)
        .eq('role', 'owner')
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      recipientId = owner?.id ?? null;
    }
    if (recipientId) {
      await admin.from('notifications').insert({
        organization_id: integration.organization_id,
        recipient_id: recipientId,
        title: 'New Facebook lead',
        body: `${normalized.name || normalized.phone || normalized.email || 'New buyer'}${productInterest ? ` · ${productInterest}` : ''}`,
        type: 'facebook_lead',
      });
    }

    await Promise.all([
      admin.from('facebook_lead_events').update({ status: 'processed', lead_id: lead.id, error: null, processed_at: new Date().toISOString() }).eq('id', event.id),
      admin.from('external_integrations').update({ last_synced_at: new Date().toISOString(), status: 'connected', updated_at: new Date().toISOString() }).eq('id', integration.id),
    ]);
    return { ok: true, leadId: lead.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Facebook lead ingestion error';
    await admin.from('facebook_lead_events').update({ status: 'failed', error: message, processed_at: new Date().toISOString() }).eq('id', event.id);
    await admin.from('external_integrations').update({ status: 'degraded', updated_at: new Date().toISOString() }).eq('id', integration.id);
    throw error;
  }
}
