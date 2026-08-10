import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type BridgeEvent = {
  type: string;
  id?: string;
  occurred_at?: string;
  data?: Record<string, any>;
};

export function hashSecret(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export async function authenticateBridge(request: Request, slug: string) {
  const publicKey = request.headers.get('x-workflow-key');
  const secret = request.headers.get('x-workflow-secret');
  if (!publicKey || !secret) return { ok: false as const, status: 401, error: 'Missing bridge credentials' };

  const supabase = createAdminClient();
  const { data: credential, error } = await supabase
    .from('integration_credentials')
    .select('id, integration_id, public_key, secret_hash, active, external_integrations!inner(id,organization_id,slug,status,capabilities)')
    .eq('public_key', publicKey)
    .eq('external_integrations.slug', slug)
    .maybeSingle();

  if (error || !credential || !credential.active) return { ok: false as const, status: 401, error: 'Invalid bridge credentials' };
  const expected = Buffer.from(credential.secret_hash, 'hex');
  const actual = Buffer.from(hashSecret(secret), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { ok: false as const, status: 401, error: 'Invalid bridge credentials' };
  }

  const integration = Array.isArray(credential.external_integrations)
    ? credential.external_integrations[0]
    : credential.external_integrations;
  if (!integration || integration.status === 'disabled') return { ok: false as const, status: 403, error: 'Integration disabled' };

  return { ok: true as const, supabase, integration, credential };
}

export async function recordIntegrationEvent(opts: {
  supabase: ReturnType<typeof createAdminClient>;
  organizationId: string;
  integrationId: string;
  source: string;
  event: BridgeEvent;
}) {
  const externalId = opts.event.id ?? null;
  if (externalId) {
    const { data: existing } = await opts.supabase
      .from('integration_events')
      .select('id')
      .eq('integration_id', opts.integrationId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (existing) return { duplicate: true, eventId: existing.id };
  }

  const { data, error } = await opts.supabase.from('integration_events').insert({
    organization_id: opts.organizationId,
    integration_id: opts.integrationId,
    source: opts.source,
    event_type: opts.event.type,
    external_id: externalId,
    entity_type: opts.event.type.split('.')[0] ?? null,
    entity_id: opts.event.data?.id ? String(opts.event.data.id) : null,
    payload: opts.event,
    processed_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return { duplicate: false, eventId: data.id };
}
