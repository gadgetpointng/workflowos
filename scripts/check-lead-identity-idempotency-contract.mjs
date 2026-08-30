import fs from 'node:fs';

const path = 'supabase/lead-identity-idempotency.sql';
const sql = fs.readFileSync(path, 'utf8');
const rollbackPath = 'supabase/lead-identity-idempotency-rollback.sql';
const rollback = fs.readFileSync(rollbackPath, 'utf8');
const runtimePath = 'lib/buyers/lead-identity.ts';
const runtime = fs.readFileSync(runtimePath, 'utf8');

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

const rollbackRequired = [
  'drop index if exists public.leads_org_normalized_phone_unique',
  'drop index if exists public.leads_org_normalized_email_unique',
  'drop column if exists normalized_phone',
  'drop column if exists normalized_email',
];
for (const marker of rollbackRequired) {
  if (!rollback.toLowerCase().includes(marker)) {
    throw new Error(`Lead identity rollback contract missing required marker: ${marker}`);
  }
}

const rollbackLowered = rollback.toLowerCase();
const rollbackForbidden = [
  'drop table',
  'truncate ',
  'delete from public.leads',
  ' cascade',
  'service_role',
  'security definer',
];
for (const marker of rollbackForbidden) {
  if (rollbackLowered.includes(marker)) {
    throw new Error(`Lead identity rollback contract contains forbidden marker: ${marker}`);
  }
}

const rollbackIndexCount = (rollbackLowered.match(/drop index if exists public\.leads_org_normalized_/g) ?? []).length;
const rollbackColumnCount = (rollbackLowered.match(/drop column if exists normalized_/g) ?? []).length;
if (rollbackIndexCount !== 2 || rollbackColumnCount !== 2) {
  throw new Error(`Lead identity rollback must remove exactly two indexes and two generated columns (indexes=${rollbackIndexCount}, columns=${rollbackColumnCount})`);
}

const runtimeRequired = [
  "insertError?.code !== '23505'",
  ".eq('organization_id', organizationId)",
  ".eq('normalized_phone', normalizedPhone)",
  ".eq('normalized_email', normalizedEmail)",
  "'leads.select.unique_conflict_phone'",
  "'leads.select.unique_conflict_email'",
  "code: error.code",
];

for (const marker of runtimeRequired) {
  if (!runtime.includes(marker)) {
    throw new Error(`Lead identity runtime recovery contract missing required marker: ${marker}`);
  }
}

const runtimeForbidden = [
  'phoneRecoveryError.message',
  'emailRecoveryError.message',
  'insertError.message',
];
for (const marker of runtimeForbidden) {
  if (runtime.includes(marker)) {
    throw new Error(`Lead identity runtime recovery contract contains forbidden marker: ${marker}`);
  }
}

if (!runtime.includes("replace(/\\D/g, '')") || !runtime.includes("trim().toLowerCase()")) {
  throw new Error('Lead identity runtime normalization must mirror the conservative schema normalization');
}

console.log('Lead identity idempotency contract OK');
