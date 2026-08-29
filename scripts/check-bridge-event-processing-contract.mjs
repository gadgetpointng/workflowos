import fs from 'node:fs';

const bridge = fs.readFileSync('lib/integrations/bridge.ts', 'utf8');
const commerce = fs.readFileSync('app/api/bridge/[integration]/commerce/route.ts', 'utf8');
const genericBridge = fs.readFileSync('app/api/bridge/[integration]/route.ts', 'utf8');
const failures = [];

const requireText = (label, source, expected) => {
  for (const value of expected) {
    if (!source.includes(value)) failures.push(`${label}: missing ${JSON.stringify(value)}`);
  }
};

requireText('shared bridge event recorder', bridge, [
  'deferProcessed?: boolean',
  "processed_at: opts.deferProcessed ? null : new Date().toISOString()",
  'if (!opts.deferProcessed || existing.processed_at)',
  'if (!opts.deferProcessed || raced.processed_at)',
  'EVENT_RETRY_AFTER_MS',
]);

const organizationScopedDedupeReads = bridge.split(".eq('organization_id', opts.organizationId)").length - 1;
if (organizationScopedDedupeReads < 2) {
  failures.push('shared bridge event recorder: both existing-event and raced-event dedupe reads must be organization scoped');
}

requireText('commerce retryable event processing', commerce, [
  'deferProcessed: true',
  'tracked.inProgress',
  'await markIntegrationEventProcessed',
]);

if (genericBridge.includes('deferProcessed: true')) {
  failures.push('generic bridge route must keep immediate event dedupe semantics until all legacy side effects are retry-safe');
}
if (genericBridge.includes('markIntegrationEventProcessed')) {
  failures.push('generic bridge route must not opt into deferred processing without a complete retry-safe side-effect conversion');
}

requireText('generic bridge organization-scoped writes', genericBridge, [
  ").eq('id', leadId).eq('organization_id', orgId);",
  ").eq('id',leadId).eq('organization_id', orgId);",
  ").eq('id',leadId).eq('organization_id',orgId);",
  ").eq('id', integration.id).eq('organization_id', orgId);",
]);

if (genericBridge.includes(".eq('id', leadId);")) {
  failures.push('generic bridge route must not update WhatsApp leads by id without organization scope');
}
if (genericBridge.includes(".eq('id',leadId);")) {
  failures.push('generic bridge route must not update lead assignment/acquisition rows by id without organization scope');
}
if (genericBridge.includes(".eq('id', integration.id);")) {
  failures.push('generic bridge route must not update integration sync state by id without organization scope');
}

if (failures.length) {
  console.error('Bridge event processing contract gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Bridge event processing contract gate passed.');
