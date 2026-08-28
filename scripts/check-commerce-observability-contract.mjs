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

const routeRetry = route.match(/COMMAND_DISPATCH_RETRY_AFTER_MS\s*=\s*([^;]+);/)?.[1]?.replace(/\s+/g, '');
const policyRetry = policy.match(/COMMAND_DISPATCH_RETRY_AFTER_MS\s*=\s*([^;]+);/)?.[1]?.replace(/\s+/g, '');
if (!routeRetry || !policyRetry || routeRetry !== policyRetry) {
  failures.push('commerce observability: UI stale-window policy must match the command dispatch retry window');
}

requireText('commerce command delivery status', status, [
  "canManage(profile.role)",
  ".from('integration_commands')",
  ".select('id,status,attempt_count,dispatched_at,updated_at')",
  ".eq('organization_id', profile.organization_id)",
  ".in('status', ['approved', 'dispatched'])",
  'isCommandDispatchStale(command.dispatched_at, now)',
  'COMMAND_DISPATCH_RETRY_AFTER_MS / 60000',
  "console.error('Could not load commerce command delivery observability', error)",
  'Delivery telemetry unavailable',
  'Command dispatch health',
  'Stale / retryable',
  'Highest attempt',
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

if (failures.length) {
  console.error('Commerce observability contract gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commerce observability contract gate passed.');
