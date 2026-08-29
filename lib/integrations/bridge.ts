import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type BridgeEvent = {
  type: string;
  id?: string;
  occurred_at?: string;
  data?: Record<string, any>;
};

const EVENT_RETRY_AFTER_MS = 2 * 60 * 1000;

export function hashSecret(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function authenticateBridge(request: Request, slug: string) {
  // Backward-compatible bridge headers used by existing WorkflowOS connectors.
  const workflowPublicKey = request.headers.get('x-workflow-key');
  const workflowSecret = request.headers.get('x-workflow-secret');

  // ChatGPT Site / GadgetPoint aliases. The bridge ID is the public credential id;
  // the private bridge secret is carried as a standard Bearer token.
  const gadgetPointPublicKey = request.headers.get('x-gadgetpoint-bridge-id');
  const gadgetPointSecret = bearerToken(request);

  const publicKey = workflowPublicKey || gadgetPointPublicKey;
  const secret = workflowSecret || gadgetPointSecret;

  if (!publicKey || !secret) {
    return {
      ok: false as const,
      status: 401,
      error: 'Missing bridge credentials',
    };
  }

  const supabase = createAdminClient();
  const { data: credential, error } = await supabase
    .from('integration_credentials')
    .select('id, integration_id, public_key, secret_hash, active, external_integrations!inner(id,organization_id,slug,status,capabilities)')
    .eq('public_key', publicKey)
    .eq('external_integrations.slug', slug)
    .maybeSingle();

  if (error || !credential || !credential.active) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid bridge credentials',
    };
  }

  const expected = Buffer.from(credential.secret_hash, 'hex');
  const actual = Buffer.from(hashSecret(secret), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid bridge credentials',
    };
  }

  const integration = Array.isArray(credential.external_integrations)
    ? credential.external_integrations[0]
    : credential.external_integrations;
  if (!integration || integration.status === 'disabled') {
    return {
      ok: false as const,
      status: 403,
      error: 'Integration disabled',
    };
  }

  return { ok: true as const, supabase, integration, credential };
}

export async function recordIntegrationEvent(opts: {
  supabase: ReturnType<typeof createAdminClient>;
  organizationId: string;
  integrationId: string;
  source: string;
  event: BridgeEvent;
  deferProcessed?: boolean;
}) {
  const externalId = opts.event.id ?? null;
  if (externalId) {
    const { data: existing, error: existingError } = await opts.supabase
      .from('integration_events')
      .select('id,processed_at,created_at')
      .eq('integration_id', opts.integrationId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (!opts.deferProcessed || existing.processed_at) {
        return { duplicate: true, inProgress: false, retry: false, eventId: existing.id };
      }
      const createdAt = Date.parse(String(existing.created_at || ''));
      const inProgress = Number.isFinite(createdAt) && Date.now() - createdAt < EVENT_RETRY_AFTER_MS;
      return { duplicate: false, inProgress, retry: !inProgress, eventId: existing.id };
    }
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
    processed_at: opts.deferProcessed ? null : new Date().toISOString(),
  }).select('id').single();

  if (error && externalId && error.code === '23505') {
    const { data: raced, error: racedError } = await opts.supabase
      .from('integration_events')
      .select('id,processed_at')
      .eq('integration_id', opts.integrationId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (racedError) throw racedError;
    if (raced) {
      if (!opts.deferProcessed || raced.processed_at) {
        return { duplicate: true, inProgress: false, retry: false, eventId: raced.id };
      }
      return { duplicate: false, inProgress: true, retry: false, eventId: raced.id };
    }
  }

  if (error) throw error;
  return { duplicate: false, inProgress: false, retry: false, eventId: data.id };
}

export async function markIntegrationEventProcessed(opts: {
  supabase: ReturnType<typeof createAdminClient>;
  organizationId: string;
  integrationId: string;
  eventId: string;
}) {
  const { error } = await opts.supabase
    .from('integration_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', opts.eventId)
    .eq('organization_id', opts.organizationId)
    .eq('integration_id', opts.integrationId);
  if (error) throw error;
}
