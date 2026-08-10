import { createAdminClient } from '@/lib/supabase/admin';
import { requiresExternalCommand } from './ownership';

export const COMMAND_STATUSES = ['pending_approval','approved','dispatched','acknowledged','failed','cancelled'] as const;
export type IntegrationCommandStatus = typeof COMMAND_STATUSES[number];

export async function createIntegrationCommand(input: {
  organizationId: string;
  integrationId: string;
  commandType: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  payload?: Record<string, unknown>;
  requestedBy?: string | null;
  idempotencyKey?: string | null;
}) {
  if (!requiresExternalCommand(input.commandType)) {
    throw new Error('Unsupported external command type');
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('integration_commands').insert({
    organization_id: input.organizationId,
    integration_id: input.integrationId,
    command_type: input.commandType,
    target_entity_type: input.targetEntityType ?? null,
    target_entity_id: input.targetEntityId ?? null,
    payload: input.payload ?? {},
    status: 'pending_approval',
    requested_by: input.requestedBy ?? null,
    idempotency_key: input.idempotencyKey ?? null
  }).select().single();
  if (error) throw error;
  return data;
}
