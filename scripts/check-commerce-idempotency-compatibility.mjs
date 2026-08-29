import fs from 'node:fs/promises';

const helperPath = new URL('../lib/integrations/idempotency.ts', import.meta.url);
const helperSource = await fs.readFile(helperPath, 'utf8');

if (!helperSource.includes("export function deterministicUuid(seed: string)")) {
  throw new Error('Shared commerce idempotency helper signature changed');
}

const executableSource = helperSource
  .replace("import crypto from 'crypto';", "import crypto from 'node:crypto';")
  .replace('export function deterministicUuid(seed: string)', 'export function deterministicUuid(seed)');

const helperModule = await import(`data:text/javascript;base64,${Buffer.from(executableSource).toString('base64')}`);
const { deterministicUuid } = helperModule;

if (typeof deterministicUuid !== 'function') {
  throw new Error('Shared deterministicUuid helper could not be executed');
}

const compatibilityVectors = [
  {
    seed: 'commerce-command-notification:11111111-1111-1111-1111-111111111111:22222222-2222-2222-2222-222222222222:acknowledged',
    expected: '51d77b41-c09d-5947-865d-f542e3b79116',
  },
  {
    seed: 'commerce-command-activity:11111111-1111-1111-1111-111111111111:failed',
    expected: '87a4d66b-2859-5071-9f5a-cb8798d50033',
  },
  {
    seed: '33333333-3333-3333-3333-333333333333:44444444-4444-4444-4444-444444444444:awaiting_payment',
    expected: '505fe9c0-c551-5839-a324-e26132c042b9',
  },
];

for (const vector of compatibilityVectors) {
  const actual = deterministicUuid(vector.seed);
  if (actual !== vector.expected) {
    throw new Error(`Commerce idempotency compatibility changed for ${vector.seed}: expected ${vector.expected}, received ${actual}`);
  }
}

const repeatSeed = compatibilityVectors[0].seed;
if (deterministicUuid(repeatSeed) !== deterministicUuid(repeatSeed)) {
  throw new Error('Commerce deterministic UUID helper is not deterministic');
}

console.log(`Commerce idempotency compatibility verified (${compatibilityVectors.length} vectors).`);
