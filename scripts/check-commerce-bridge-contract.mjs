import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];

function requireText(label, content, expected) {
  for (const value of expected) {
    if (!content.includes(value)) failures.push(`${label}: missing ${JSON.stringify(value)}`);
  }
}

const commands = read('app/api/bridge/[integration]/commands/route.ts');
const commerce = read('app/api/bridge/[integration]/commerce/route.ts');
const quotes = read('app/api/quotes/[id]/route.ts');
const docs = read('docs/GADGETPOINT_COMMERCE_BRIDGE.md');

requireText('commands route', commands, [
  "authenticateBridge(request, slug)",
  "canReceiveCommands",
  ".eq('status', 'approved')",
  "status:'dispatched'",
  "['acknowledged','failed']",
  "command.command_type === 'order.create'",
  "commerce_order_id",
  "order_request_failed",
]);

requireText('commerce route', commerce, [
  "authenticateBridge(request, slug)",
  "canPublishEvents",
  "'order.created'",
  "'order.updated'",
  "'payment.updated'",
  "recordIntegrationEvent",
  "tracked.duplicate",
  "advanceBuyerWorkflowFromPayment",
  "advanceBuyerWorkflowFromOrder",
]);

requireText('quote acceptance', quotes, [
  "b.status==='accepted'",
  "const idempotencyKey=`quote:${id}:order.create`",
  "commandType:'order.create'",
  "targetEntityType:'quote'",
  "source:'workflowos_quote'",
  "commerce_command_id",
]);

requireText('bridge documentation', docs, [
  'GET /api/bridge/gadgetpoint/commands',
  'POST /api/bridge/gadgetpoint/commands',
  'POST /api/bridge/gadgetpoint/commerce',
  '`order.create`',
  '`order.created`',
  '`order.updated`',
  '`payment.updated`',
  'idempotent',
  'WorkflowOS must never directly insert or mutate GadgetPoint Admin',
]);

if (failures.length) {
  console.error('Commerce bridge contract gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commerce bridge contract gate passed.');
