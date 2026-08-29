import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];

function requireText(label, content, expected) {
  for (const value of expected) {
    if (!content.includes(value)) failures.push(`${label}: missing ${JSON.stringify(value)}`);
  }
}

function forbidText(label, content, forbidden) {
  for (const value of forbidden) {
    if (content.includes(value)) failures.push(`${label}: forbidden ${JSON.stringify(value)}`);
  }
}

const route = read('app/api/bridge/[integration]/commands/route.ts');
const policy = read('lib/integrations/command-dispatch.ts');
const status = read('components/CommerceCommandDeliveryStatus.tsx');
const section = read('components/GadgetPointStaffAccessStatusSection.tsx');

requireText('commerce command dispatch shared policy', route, [
  "import { COMMAND_DISPATCH_RETRY_AFTER_MS } from '@/lib/integrations/command-dispatch'",
  'Date.now() - COMMAND_DISPATCH_RETRY_AFTER_MS',
]);
forbidText('commerce command dispatch shared policy', route, [
  'const COMMAND_DISPATCH_RETRY_AFTER_MS =',
]);

requireText('commerce command delivery policy', policy, [
  'COMMAND_DISPATCH_RETRY_AFTER_MS = 15 * 60 * 1000',
  'COMMAND_DISPATCH_WARNING_STALE_MS = 60 * 60 * 1000',
  'COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT = 3',
  'needsCommandDeliveryAttention',
  'attemptCount >= COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT',
  'dispatchedMs < nowMs - COMMAND_DISPATCH_WARNING_STALE_MS',
]);

requireText('commerce command delivery status', status, [
  "canManage(profile.role)",
  ".from('integration_commands')",
  ".select('id,status,attempt_count,dispatched_at,updated_at')",
  ".eq('organization_id', profile.organization_id)",
  ".in('status', ['approved', 'dispatched'])",
  'isCommandDispatchStale(command.dispatched_at, now)',
  'COMMAND_DISPATCH_RETRY_AFTER_MS / 60000',
  'COMMAND_DISPATCH_WARNING_STALE_MS / 60000',
  'COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT',
  'needsCommandDeliveryAttention(Number(command.attempt_count ?? 0), command.dispatched_at, now)',
  "console.error('Could not load commerce command delivery observability', error)",
  'Delivery telemetry unavailable',
  'Command dispatch health',
  'Stale / retryable',
  'Highest attempt',
  'Needs attention',
  'Recovery remains automatic; no retry cap or command mutation is applied here.',
]);

requireText('integrations observability placement', section, [
  "import CommerceCommandDeliveryStatus from '@/components/CommerceCommandDeliveryStatus'",
  '<CommerceCommandDeliveryStatus />',
]);

forbidText('commerce command delivery privacy', status, [
  'payload',
  'last_error',
  'result',
  'target_entity_id',
]);

forbidText('commerce command delivery warning mutation', status, [
  ".update(",
  ".insert(",
  ".delete(",
]);

if (failures.length) {
  console.error('Commerce observability contract gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commerce observability contract gate passed.');
