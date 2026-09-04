import fs from 'node:fs/promises';

const helperPath = new URL('../lib/integrations/idempotency.ts', import.meta.url);
const commerceRoutePath = new URL('../app/api/bridge/[integration]/commerce/route.ts', import.meta.url);
const helperSource = await fs.readFile(helperPath, 'utf8');
const commerceRouteSource = await fs.readFile(commerceRoutePath, 'utf8');

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
  {
    seed: 'commerce-event-activity:55555555-5555-5555-5555-555555555555:payment.updated',
    expected: '444c0d78-2fd2-524c-b0df-9a5ec57a8665',
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

const requiredCommerceActivityContract = [
  "import { deterministicUuid } from '@/lib/integrations/idempotency'",
  'id: deterministicUuid(`commerce-event-activity:${tracked.eventId}:${event.type}`)',
  "if (activityError && activityError.code !== '23505') throw activityError",
];
for (const required of requiredCommerceActivityContract) {
  if (!commerceRouteSource.includes(required)) {
    throw new Error(`Commerce event activity idempotency contract missing ${JSON.stringify(required)}`);
  }
}

if (commerceRouteSource.includes('if (activityError) throw activityError;')) {
  throw new Error('Commerce event activity retries must tolerate duplicate-key 23505');
}

console.log(`Commerce idempotency compatibility verified (${compatibilityVectors.length} vectors) with retry-safe event activity logging.`);
