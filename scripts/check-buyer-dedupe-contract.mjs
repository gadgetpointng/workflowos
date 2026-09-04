import fs from 'node:fs';

const inbound = fs.readFileSync('lib/buyers/inbound.ts', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const release = fs.readFileSync('docs/BUYER_ACQUISITION_RELEASE.md', 'utf8');

const evidenceBlock = inbound.match(/const evidence = \{([\s\S]*?)\n  \};/)?.[1] || '';
const evidenceInputIndex = evidenceBlock.indexOf('...(input.evidence || {})');
const evidenceCaptureIndex = evidenceBlock.indexOf("capture: 'integration'");
const evidenceExternalIdIndex = evidenceBlock.indexOf('external_id: externalId');
const evidenceStageIndex = evidenceBlock.indexOf('workflow_stage: stage');
const ownerErrorGuard = "if (ownerError) throw new Error('Could not validate buyer routing owner')";
const buyerInsert = "admin.from('buyer_intents').insert";

const checks = [
  [
    'buyer_intents stores external_ref',
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
    'system evidence fields override caller-supplied provenance',
    evidenceInputIndex >= 0 &&
      evidenceCaptureIndex > evidenceInputIndex &&
      evidenceExternalIdIndex > evidenceInputIndex &&
      evidenceStageIndex > evidenceInputIndex,
  ],
  [
    'adapter-supplied assignee is constrained to an active profile in the same organization',
    inbound.includes(".eq('id', assignedTo)") &&
      inbound.includes(".eq('organization_id', input.organizationId)") &&
      inbound.includes(".eq('active', true)") &&
      inbound.includes('assignedTo = assignee?.id || null') &&
      inbound.includes('assigned_to: assignedTo') &&
      inbound.includes('assignee_id: assignedTo') &&
      inbound.includes('const recipientId = assignedTo || ownerId'),
  ],
  [
    'assignee validation fails closed on database errors',
    inbound.includes('error: assigneeError') &&
      inbound.includes("if (assigneeError) throw new Error('Could not validate buyer assignee')") &&
      inbound.indexOf("if (assigneeError) throw new Error('Could not validate buyer assignee')") < inbound.indexOf('assignedTo = assignee?.id || null'),
  ],
  [
    'fallback owner routing is resolved in the same organization and fails closed before buyer creation',
    inbound.includes('error: ownerError') &&
      inbound.includes(".eq('role', 'owner')") &&
      inbound.includes('ownerId = owner?.id || null') &&
      inbound.includes(ownerErrorGuard) &&
      inbound.indexOf(ownerErrorGuard) < inbound.indexOf(buyerInsert) &&
      inbound.includes('const creatorId = assignedTo || ownerId') &&
      inbound.includes('const recipientId = assignedTo || ownerId'),
  ],
  [
    'inventory matching fails closed on database errors',
    inbound.includes('error: productsError') &&
      inbound.includes("if (productsError) throw new Error('Could not load connected inventory for buyer matching')") &&
      inbound.indexOf("if (productsError) throw new Error('Could not load connected inventory for buyer matching')") < inbound.indexOf('const matches = matchProducts'),
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
