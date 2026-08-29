import fs from 'node:fs';

const target = 'lib/growth/storefront-intelligence.ts';
const source = fs.readFileSync(target, 'utf8');

const required = [
  "console.error('Storefront intelligence read failed', { operation, code: error.code })",
  "observeReadFailure('staff_capabilities.select.sales_assignee', capabilitiesError)",
  "observeReadFailure('tasks.select.sales_assignee_load', openTasksError)",
  "observeReadFailure('commerce_signals.count.product_signal', error)",
  "observeReadFailure('commerce_signals.select.search_history', error)",
  "observeReadFailure('growth_recommendations.select.existing', existingError)",
];

for (const marker of required) {
  if (!source.includes(marker)) {
    throw new Error(`Storefront intelligence observability contract missing: ${marker}`);
  }
}

const forbidden = [
  'capabilitiesError.message',
  'openTasksError.message',
  'existingError.message',
  'error.message',
  'console.error(\'Storefront intelligence read failed\', { operation, code: error.code, message:',
];

for (const marker of forbidden) {
  if (source.includes(marker)) {
    throw new Error(`Storefront intelligence observability contract forbids database error messages: ${marker}`);
  }
}

const orgScopedReads = [
  ".from('staff_capabilities')",
  ".from('tasks')",
  ".from('commerce_signals')",
  ".from('growth_recommendations')",
];

for (const marker of orgScopedReads) {
  const index = source.indexOf(marker);
  if (index === -1) throw new Error(`Storefront intelligence contract missing read: ${marker}`);
  const readWindow = source.slice(index, index + 900);
  if (!readWindow.includes(".eq('organization_id', organizationId)")) {
    throw new Error(`Storefront intelligence read lost organization scope: ${marker}`);
  }
}

console.log('Storefront intelligence read observability contract passed.');
