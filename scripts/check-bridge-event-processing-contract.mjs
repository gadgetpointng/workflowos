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

requireText('generic buyer workflow write observability', genericBridge, [
  "operation: 'customer_conversations.insert'",
  "operation: 'buyer_intents.upsert'",
  "operation: 'tasks.insert'",
  "operation: 'leads.update.whatsapp_refresh'",
  "operation: 'leads.update.whatsapp_assignment'",
  "operation: 'leads.update.acquisition_refresh'",
  "operation: 'external_integrations.update'",
  "operation: 'analytics_events.insert.vendor_sale'",
  "operation: 'analytics_events.insert.acquisition_lead'",
  "operation: 'commerce_signals.insert.order'",
  "operation: 'growth_opportunities.insert.low_stock'",
  "operation: 'activity_logs.insert.storefront_intelligence_failure'",
  "code: conversationError.code",
  "code: buyerIntentError.code",
  "code: marketplaceBuyerIntentError.code",
  "code: taskError.code",
  "code: leadRefreshError.code",
  "code: leadAssignmentError.code",
  "code: acquisitionLeadUpdateError.code",
  "code: integrationSyncError.code",
  "code: vendorAnalyticsError.code",
  "code: acquisitionAnalyticsError.code",
  "code: orderSignalError.code",
  "code: lowStockOpportunityError.code",
  "code: storefrontIntelligenceActivityError.code",
]);

for (const forbidden of [
  'conversationError.message',
  'buyerIntentError.message',
  'marketplaceBuyerIntentError.message',
  'taskError.message',
  'leadRefreshError.message',
  'leadAssignmentError.message',
  'acquisitionLeadUpdateError.message',
  'integrationSyncError.message',
  'vendorAnalyticsError.message',
  'acquisitionAnalyticsError.message',
  'orderSignalError.message',
  'lowStockOpportunityError.message',
  'storefrontIntelligenceActivityError.message',
]) {
  if (genericBridge.includes(forbidden)) {
    failures.push(`generic buyer workflow write observability must not log database error messages: ${forbidden}`);
  }
}

if (genericBridge.includes('intelligenceError?.message')) {
  failures.push('generic storefront intelligence failure telemetry must not persist raw exception messages');
}
requireText('generic storefront intelligence error privacy', genericBridge, [
  "error_code: intelligenceFailureCode",
  "'storefront_intelligence_failed'",
]);

for (const errorName of [
  'conversationError',
  'buyerIntentError',
  'marketplaceBuyerIntentError',
  'taskError',
  'leadRefreshError',
  'leadAssignmentError',
  'acquisitionLeadUpdateError',
  'integrationSyncError',
  'vendorAnalyticsError',
  'acquisitionAnalyticsError',
  'orderSignalError',
  'lowStockOpportunityError',
  'storefrontIntelligenceActivityError',
]) {
  const postDedupeFailure = new RegExp(`return\\s+NextResponse\\.json\\(\\{\\s*error:\\s*${errorName}\\.code`);
  if (postDedupeFailure.test(genericBridge)) {
    failures.push(`generic bridge immediate-dedupe path must not fail closed after observed ${errorName}`);
  }
}

// The generic bridge still uses immediate event dedupe, so silently adding more unchecked
// database writes would increase the number of side effects that cannot recover on retry.
// Freeze that legacy debt by table/operation while allowing future fixes to reduce it.
const legacyUncheckedWriteBudget = new Map([
  ['growth_opportunities:insert', 0],
  ['commerce_signals:insert', 0],
  ['activity_logs:insert', 0],
  ['analytics_events:insert', 0],
  ['leads:update', 0],
  ['customer_conversations:insert', 0],
  ['buyer_intents:upsert', 0],
  ['tasks:insert', 0],
  ['external_integrations:update', 0],
]);
const uncheckedWriteCounts = new Map();
for (const line of genericBridge.split('\n')) {
  if (!line.includes('await supabase.from(')) continue;
  const write = line.match(/await supabase\.from\('([^']+)'\)\.(insert|update|upsert|delete)\(/);
  if (!write) continue;
  const checkedResult = line.includes('const {') && /\berror\b/.test(line.slice(0, line.indexOf('await supabase.from(')));
  if (checkedResult) continue;
  const key = `${write[1]}:${write[2]}`;
  uncheckedWriteCounts.set(key, (uncheckedWriteCounts.get(key) ?? 0) + 1);
}

for (const [key, count] of uncheckedWriteCounts) {
  const budget = legacyUncheckedWriteBudget.get(key);
  if (budget === undefined) {
    failures.push(`generic bridge unchecked-write budget: new unchecked write ${key} is not allowed`);
  } else if (count > budget) {
    failures.push(`generic bridge unchecked-write budget: ${key} grew from maximum ${budget} to ${count}`);
  }
}

if (failures.length) {
  console.error('Bridge event processing contract gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Bridge event processing contract gate passed.');
