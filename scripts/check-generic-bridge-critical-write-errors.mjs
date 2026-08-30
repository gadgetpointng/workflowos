import fs from 'node:fs';

const bridge = fs.readFileSync('app/api/bridge/[integration]/route.ts', 'utf8');
const failures = [];

const rawMessagePattern = /error\.message/g;
const totalRawMessages = (bridge.match(rawMessagePattern) ?? []).length;

// The generic bridge still uses immediate event dedupe. These seven fail-closed
// responses are legacy critical/mirror writes whose retry semantics must be
// redesigned before their behavior changes. Freeze the exposure debt here so
// new raw database-message returns cannot be introduced accidentally.
const classifiedCriticalWrites = [
  {
    label: 'site heartbeat mirror write',
    start: "if (event.type === 'site.heartbeat')",
    end: "if (event.type === 'staff.upsert')",
    write: "from('connected_sites').upsert",
  },
  {
    label: 'staff mirror write',
    start: "if (event.type === 'staff.upsert')",
    end: "if (event.type === 'product.upsert' || event.type === 'inventory.updated')",
    write: "from('connected_staff').upsert",
  },
  {
    label: 'product/inventory mirror write',
    start: "if (event.type === 'product.upsert' || event.type === 'inventory.updated')",
    end: "if (event.type === 'order.created' || event.type === 'order.updated')",
    write: "from('connected_products').upsert",
  },
  {
    label: 'order mirror write',
    start: "if (event.type === 'order.created' || event.type === 'order.updated')",
    end: "if (['storefront.search','product.view','cart.added','marketplace.demand'].includes(event.type))",
    write: "from('connected_orders').upsert",
  },
  {
    label: 'storefront primary signal write',
    start: "if (['storefront.search','product.view','cart.added','marketplace.demand'].includes(event.type))",
    end: "if (event.type === 'vendor.order.created')",
    write: "from('commerce_signals').insert",
  },
  {
    label: 'vendor order critical write',
    start: "if (event.type === 'vendor.order.created')",
    end: "if (event.type === 'social.engagement' || event.type === 'campaign.attribution')",
    write: "from('vendor_orders').insert",
  },
  {
    label: 'social analytics mirror write',
    start: "if (event.type === 'social.engagement' || event.type === 'campaign.attribution')",
    end: 'const automations = await runAutomationsForBridgeEvent',
    write: "from('analytics_events').insert",
  },
];

for (const entry of classifiedCriticalWrites) {
  const start = bridge.indexOf(entry.start);
  const end = bridge.indexOf(entry.end, start + 1);
  if (start < 0 || end < 0 || end <= start) {
    failures.push(`${entry.label}: classification boundaries are missing or reordered`);
    continue;
  }
  const section = bridge.slice(start, end);
  if (!section.includes(entry.write)) {
    failures.push(`${entry.label}: expected critical write marker ${entry.write} is missing`);
  }
  const sectionRawMessages = (section.match(rawMessagePattern) ?? []).length;
  if (sectionRawMessages !== 1) {
    failures.push(`${entry.label}: expected exactly one legacy raw database-message return, found ${sectionRawMessages}`);
  }
}

if (totalRawMessages !== classifiedCriticalWrites.length) {
  failures.push(`generic bridge raw database-message budget changed: expected ${classifiedCriticalWrites.length}, found ${totalRawMessages}`);
}

for (const forbiddenBestEffortError of [
  'whatsappLeadInsertError.message',
  'acquisitionLeadInsertError.message',
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
  if (bridge.includes(forbiddenBestEffortError)) {
    failures.push(`best-effort buyer side effect must not expose database messages: ${forbiddenBestEffortError}`);
  }
}

if (failures.length) {
  console.error('Generic bridge critical-write error classification gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Generic bridge critical-write error classification gate passed (${totalRawMessages} classified legacy raw-message returns).`);
