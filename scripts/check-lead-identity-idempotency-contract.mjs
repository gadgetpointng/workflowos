import fs from 'node:fs';

const path = 'supabase/lead-identity-idempotency.sql';
const sql = fs.readFileSync(path, 'utf8');

const required = [
  'generated always as',
  "regexp_replace(phone, '[^0-9]+', '', 'g')",
  "lower(btrim(email))",
  'leads_org_normalized_phone_unique',
  'on public.leads (organization_id, normalized_phone)',
  'leads_org_normalized_email_unique',
  'on public.leads (organization_id, normalized_email)',
  'no country-code inference',
];

for (const marker of required) {
  if (!sql.includes(marker)) {
    throw new Error(`Lead identity idempotency contract missing required marker: ${marker}`);
  }
}

const forbidden = [
  'service_role',
  'security definer',
  'drop table',
  'truncate ',
  'delete from public.leads',
];

const lowered = sql.toLowerCase();
for (const marker of forbidden) {
  if (lowered.includes(marker)) {
    throw new Error(`Lead identity idempotency contract contains forbidden marker: ${marker}`);
  }
}

const uniqueIndexCount = (lowered.match(/create unique index if not exists leads_org_normalized_/g) ?? []).length;
if (uniqueIndexCount !== 2) {
  throw new Error(`Expected exactly two organization-scoped normalized lead identity indexes, found ${uniqueIndexCount}`);
}

console.log('Lead identity idempotency contract OK');
