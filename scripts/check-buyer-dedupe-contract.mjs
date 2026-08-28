import fs from 'node:fs';

const inbound = fs.readFileSync('lib/buyers/inbound.ts', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const release = fs.readFileSync('docs/BUYER_ACQUISITION_RELEASE.md', 'utf8');

const checks = [
  [
    "buyer_intents stores external_ref",
    inbound.includes('external_ref: externalId'),
  ],
  [
    'pre-check dedupes by organization/source/external_ref',
    inbound.includes(".eq('organization_id', input.organizationId)") &&
      inbound.includes(".eq('source', source)") &&
      inbound.includes(".eq('external_ref', externalId)"),
  ],
  [
    'unique-race conflicts return the existing buyer request',
    inbound.includes("error?.code === '23505'") &&
      inbound.includes('racedDuplicate') &&
      inbound.includes('duplicate: true'),
  ],
  [
    'database enforces source-scoped external reference uniqueness',
    schema.includes('unique (organization_id, source, external_ref)'),
  ],
  [
    'release gate records duplicate prevention verification',
    release.includes('- [x] Duplicate inbound buyer prevention verified per source/external ID'),
  ],
];

const failures = checks.filter(([, ok]) => !ok);
if (failures.length) {
  for (const [name] of failures) console.error(`FAIL: ${name}`);
  process.exit(1);
}

for (const [name] of checks) console.log(`PASS: ${name}`);
