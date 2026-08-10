import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { hashSecret } from '@/lib/integrations/bridge';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const { data: integration } = await supabase
    .from('external_integrations')
    .select('id,organization_id,slug')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();
  if (!integration) return NextResponse.json({ error: 'Integration not found' }, { status: 404 });

  const publicKey = `wfos_${crypto.randomBytes(10).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('base64url');
  const { error } = await supabase.from('integration_credentials').insert({
    integration_id: integration.id,
    public_key: publicKey,
    secret_hash: hashSecret(secret),
    created_by: user.id
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ public_key: publicKey, secret, note: 'Store this secret now. WorkflowOS does not store the plaintext value.' }, { status: 201 });
}
