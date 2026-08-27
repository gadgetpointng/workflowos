import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const credentials = read('docs/INTEGRATION_CREDENTIALS.md');
const whatsapp = read('app/api/integrations/whatsapp/webhook/route.ts');
const instagram = read('app/api/integrations/instagram/webhook/route.ts');
const buyerInbound = read('lib/buyers/inbound.ts');

const requirements = [
  ['META_APP_SECRET', [whatsapp, instagram]],
  ['WHATSAPP_WEBHOOK_VERIFY_TOKEN', [whatsapp]],
  ['INSTAGRAM_WEBHOOK_VERIFY_TOKEN', [instagram]],
  ['META_WEBHOOK_VERIFY_TOKEN', [instagram]],
  ['GADGETPOINT_WORKSPACE_ID', [whatsapp, instagram]],
  ['BUYER_INTAKE_WEBHOOK_SECRET', [buyerInbound]],
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

const safetyPhrases = [
  'never in source control',
  'Do not store passwords in WorkflowOS',
  'official business app/account',
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
