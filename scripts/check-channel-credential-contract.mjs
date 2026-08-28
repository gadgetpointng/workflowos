import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const credentials = read('docs/INTEGRATION_CREDENTIALS.md');
const whatsapp = read('app/api/integrations/whatsapp/webhook/route.ts');
const instagram = read('app/api/integrations/instagram/webhook/route.ts');
const buyerWebhook = read('app/api/integrations/buyer-intake/webhook/route.ts');
const buyerHealth = read('app/api/integrations/buyer-intake/health/route.ts');
const buyerInbound = read('lib/buyers/inbound.ts');

const requirements = [
  ['META_APP_SECRET', [whatsapp, instagram]],
  ['WHATSAPP_WEBHOOK_VERIFY_TOKEN', [whatsapp]],
  ['INSTAGRAM_WEBHOOK_VERIFY_TOKEN', [instagram]],
  ['META_WEBHOOK_VERIFY_TOKEN', [instagram]],
  ['GADGETPOINT_WORKSPACE_ID', [whatsapp, instagram, buyerWebhook, buyerHealth]],
  ['BUYER_INTAKE_WEBHOOK_SECRET', [buyerInbound, buyerWebhook, buyerHealth]],
];

const failures = [];
for (const [name, implementationFiles] of requirements) {
  if (!credentials.includes(`\`${name}\``)) {
    failures.push(`docs/INTEGRATION_CREDENTIALS.md does not document ${name}`);
  }
  for (const source of implementationFiles) {
    if (!source.includes(name)) failures.push(`runtime adapter no longer references ${name}`);
  }
}

const workspaceBoundaryChecks = [
  ['buyer intake requires configured workspace', buyerWebhook.includes('Buyer intake workspace is not configured') && buyerWebhook.includes('status: 503')],
  ['buyer intake rejects cross-workspace payloads', buyerWebhook.includes('organizationId !== configuredWorkspaceId') && buyerWebhook.includes('Buyer intake workspace mismatch') && buyerWebhook.includes('status: 403')],
  ['buyer intake writes only to configured workspace', buyerWebhook.includes('organizationId: configuredWorkspaceId')],
  ['buyer intake requires external idempotency key', buyerWebhook.includes('external_id is required for idempotent buyer intake') && buyerWebhook.includes('externalId,')],
  ['buyer intake validates consent status before capture', buyerWebhook.includes('allowedConsentStatuses.has(consentStatus)') && buyerWebhook.includes('Unsupported consent_status')],
  ['buyer intake validates numeric budget before capture', buyerWebhook.includes('Number.isFinite(budgetMax)') && buyerWebhook.includes('budgetMax < 0') && buyerWebhook.includes('budget_max must be a non-negative number')],
  ['buyer intake passes normalized consent and budget', buyerWebhook.includes("consentStatus: consentStatus as 'unknown' | 'opted_in' | 'public_signal' | 'do_not_contact'") && buyerWebhook.includes('budgetMax,')],
  ['buyer intake health requires signature and workspace config', buyerHealth.includes('const configured = signatureConfigured && workspaceConfigured')],
  ['buyer intake health fails closed when config is incomplete', buyerHealth.includes('status: configured ? 200 : 503')],
  ['buyer intake does not expose internal error messages', buyerWebhook.includes("return NextResponse.json({ error: 'Buyer intake failed' }, { status: 500 })") && !buyerWebhook.includes("error instanceof Error ? error.message")],
];
for (const [name, ok] of workspaceBoundaryChecks) {
  if (!ok) failures.push(name);
}

const safetyPhrases = [
  'never in source control',
  'Do not store passwords in WorkflowOS',
  'official business app/account',
  'stable `external_id`',
];
for (const phrase of safetyPhrases) {
  if (!credentials.includes(phrase)) failures.push(`credential safety contract is missing: ${phrase}`);
}

if (failures.length) {
  console.error('Buyer channel credential contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Buyer channel credential contract verified.');
