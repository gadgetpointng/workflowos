type SupabaseLike = any;

type LeadIdentity = {
  phone?: string | null;
  email?: string | null;
};

function observeLeadIdentityReadFailure(operation: string, error: any) {
  if (error) console.error('Lead identity recovery read failed', { operation, code: error.code });
}

export function normalizeLeadPhone(phone?: string | null) {
  const normalized = String(phone ?? '').replace(/\D/g, '');
  return normalized || null;
}

export function normalizeLeadEmail(email?: string | null) {
  const normalized = String(email ?? '').trim().toLowerCase();
  return normalized || null;
}

export async function recoverLeadAfterUniqueConflict(
  supabase: SupabaseLike,
  organizationId: string,
  identity: LeadIdentity,
  insertError: any,
) {
  if (insertError?.code !== '23505') return null;

  const normalizedPhone = normalizeLeadPhone(identity.phone);
  if (normalizedPhone) {
    const { data, error: phoneRecoveryError } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('normalized_phone', normalizedPhone)
      .maybeSingle();
    observeLeadIdentityReadFailure('leads.select.unique_conflict_phone', phoneRecoveryError);
    if (data?.id) return data.id;
  }

  const normalizedEmail = normalizeLeadEmail(identity.email);
  if (normalizedEmail) {
    const { data, error: emailRecoveryError } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('normalized_email', normalizedEmail)
      .maybeSingle();
    observeLeadIdentityReadFailure('leads.select.unique_conflict_email', emailRecoveryError);
    if (data?.id) return data.id;
  }

  return null;
}
