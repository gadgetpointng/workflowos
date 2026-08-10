import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createIntegrationCommand } from '@/lib/integrations/commands';

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('integration_commands')
    .select('*,external_integrations(name,slug)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.integration_id || !body.command_type) return NextResponse.json({ error: 'integration_id and command_type are required' }, { status: 400 });
  try {
    const data = await createIntegrationCommand({
      organizationId: profile.organization_id,
      integrationId: body.integration_id,
      commandType: body.command_type,
      targetEntityType: body.target_entity_type ?? null,
      targetEntityId: body.target_entity_id ?? null,
      payload: body.payload ?? {},
      requestedBy: user.id,
      idempotencyKey: body.idempotency_key ?? null
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Could not create command request' }, { status: 400 });
  }
}
