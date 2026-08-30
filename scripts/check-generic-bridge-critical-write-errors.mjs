import fs from 'node:fs';

const bridge = fs.readFileSync('app/api/bridge/[integration]/route.ts', 'utf8');
const failures = [];

const rawMessagePattern = /error\.message/g;
const totalRawMessages = (bridge.match(rawMessagePattern) ?? []).length;

// These critical mirror writes remain fail-closed, but hardened paths expose only
// stable public errors with code-only telemetry. Keep this contract bounded so
// raw database-message debt can only move downward.
const hardenedCriticalWrites = [
  {
    label: 'site heartbeat mirror write',
    start: "if (event.type === 'site.heartbeat')",
    end: "if (event.type === 'staff.upsert')",
    write: "from('connected_sites').upsert",
    errorName: 'siteHeartbeatError',
    operation: 'connected_sites.upsert.site_heartbeat',
    publicError: 'Site heartbeat sync failed',
  },
  {
    label: 'staff mirror write',
    start: "if (event.type === 'staff.upsert')",
    end: "if (event.type === 'product.upsert' || event.type === 'inventory.updated')",
    write: "from('connected_staff').upsert",
    errorName: 'staffUpsertError',
    operation: 'connected_staff.upsert.staff',
    publicError: 'Staff sync failed',
  },
  {
    label: 'product/inventory mirror write',
    start: "if (event.type === 'product.upsert' || event.type === 'inventory.updated')",
    end: "if (event.type === 'order.created' || event.type === 'order.updated')",
    write: "from('connected_products').upsert",
    errorName: 'productMirrorError',
    operation: 'connected_products.upsert.product_inventory',
    publicError: 'Product inventory sync failed',
  },
  {
    label: 'order mirror write',
    start: "if (event.type === 'order.created' || event.type === 'order.updated')",
    end: "if (['storefront.search','product.view','cart.added','marketplace.demand'].includes(event.type))",
    write: "from('connected_orders').upsert",
    errorName: 'orderMirrorError',
    operation: 'connected_orders.upsert.order',
    publicError: 'Order sync failed',
  },
  {
    label: 'storefront primary signal write',
    start: "if (['storefront.search','product.view','cart.added','marketplace.demand'].includes(event.type))",
    end: "if (event.type === 'vendor.order.created')",
    write: "from('commerce_signals').insert",
    errorName: 'storefrontSignalError',
    operation: 'commerce_signals.insert.storefront_primary',
    publicError: 'Storefront signal sync failed',
  },
  {
    label: 'vendor order critical write',
    start: "if (event.type === 'vendor.order.created')",
    end: "if (event.type === 'whatsapp.inquiry')",
    write: "from('vendor_orders').insert",
    errorName: 'vendorOrderError',
    operation: 'vendor_orders.insert.order',
    publicError: 'Vendor order sync failed',
  },
];

for (const entry of hardenedCriticalWrites) {
  const start = bridge.indexOf(entry.start);
  const end = bridge.indexOf(entry.end, start + 1);
  if (start < 0 || end < 0 || end <= start) {
    failures.push(`${entry.label}: hardened classification boundaries are missing or reordered`);
    continue;
  }
  const section = bridge.slice(start, end);
  for (const marker of [entry.write, entry.errorName, entry.operation, entry.publicError]) {
    if (!section.includes(marker)) failures.push(`${entry.label}: required hardened marker is missing: ${marker}`);
  }
  if (section.includes(`${entry.errorName}.message`)) {
    failures.push(`${entry.label}: critical write error must not expose database messages`);
  }
  if (!section.includes(`code: ${entry.errorName}.code`)) {
    failures.push(`${entry.label}: critical write telemetry must be code-only`);
  }
  if (!section.includes('status: 400')) {
    failures.push(`${entry.label}: fail-closed HTTP 400 behavior must be preserved`);
  }
}

// The generic bridge still uses immediate event dedupe. This final fail-closed
// response is legacy critical/mirror write debt whose retry semantics must be
// redesigned before behavior changes. Freeze the exposure debt here so new raw
// database-message returns cannot be introduced accidentally.
const classifiedCriticalWrites = [
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

// Vendor-order privacy hardening must preserve the established commerce semantics.
const vendorStart = bridge.indexOf("if (event.type === 'vendor.order.created')");
const vendorEnd = bridge.indexOf("if (event.type === 'whatsapp.inquiry')", vendorStart + 1);
if (vendorStart < 0 || vendorEnd < 0 || vendorEnd <= vendorStart) {
  failures.push('vendor order semantics: boundaries are missing or reordered');
} else {
  const vendorSection = bridge.slice(vendorStart, vendorEnd);
  for (const marker of [
    "from('external_product_offers').select",
    ".eq('organization_id',orgId)",
    ".eq('id',d.offer_id)",
    ".eq('vendor_id',d.vendor_id)",
    "Vendor offer not found",
    'const commission = Math.max(0, gross - vendorAmount);',
    "from('vendor_orders').insert",
    "from('analytics_events').insert",
    'analytics_events.insert.vendor_sale',
    'vendorOrderError',
    'vendor_orders.insert.order',
    'Vendor order sync failed',
  ]) {
    if (!vendorSection.includes(marker)) failures.push(`vendor order semantics: required marker is missing: ${marker}`);
  }
  const primaryWrite = vendorSection.indexOf("from('vendor_orders').insert");
  const analyticsWrite = vendorSection.indexOf("from('analytics_events').insert");
  if (primaryWrite < 0 || analyticsWrite < 0 || primaryWrite >= analyticsWrite) {
    failures.push('vendor order semantics: primary vendor order write must remain before best-effort analytics');
  }
  if (!vendorSection.includes("{ status: 404 }")) {
    failures.push('vendor order semantics: stable offer-not-found HTTP 404 must be preserved');
  }
  if (!vendorSection.includes("{ status: 400 }")) {
    failures.push('vendor order semantics: fail-closed primary-write HTTP 400 must be preserved');
  }
  if (vendorSection.includes('vendorOrderError.message')) {
    failures.push('vendor order semantics: primary write must not expose database messages');
  }
  if (!vendorSection.includes('code: vendorOrderError.code')) {
    failures.push('vendor order semantics: primary write telemetry must remain code-only');
  }
  if (vendorSection.includes('vendorAnalyticsError.message')) {
    failures.push('vendor order semantics: best-effort vendor analytics must not expose database messages');
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

console.log(`Generic bridge critical-write error classification gate passed (${totalRawMessages} classified legacy raw-message returns; ${hardenedCriticalWrites.length} hardened critical writes).`);
