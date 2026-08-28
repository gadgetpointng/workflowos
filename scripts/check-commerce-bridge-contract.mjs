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
  "console.error('Could not load integration commands', error)",
  "{ error: 'Could not load integration commands' }",
  "console.error('Could not load integration command', commandError)",
  "{ error: 'Could not load integration command' }",
  "console.error('Could not update integration command', error)",
  "{ error: 'Could not update integration command' }",
]);

forbidText('commands route error privacy', commands, [
  '{ error: error.message }',
  "commandError?.message || 'Command not found'",
]);

requireText('commerce route', commerce, [
  "authenticateBridge(request, slug)",
  "canPublishEvents",
  "'order.created'",
  "'order.updated'",
  "'payment.updated'",
  "const eventId = String(event.id || '').trim()",
  "Commerce events require a stable event id for idempotency",
  "event.id = eventId",
  "recordIntegrationEvent",
  "tracked.duplicate",
  "advanceBuyerWorkflowFromPayment",
  "advanceBuyerWorkflowFromOrder",
]);

const eventIdValidation = commerce.indexOf("const eventId = String(event.id || '').trim()");
const eventRecording = commerce.indexOf('const tracked = await recordIntegrationEvent');
if (eventIdValidation === -1 || eventRecording === -1 || eventIdValidation > eventRecording) {
  failures.push('commerce route: stable event id validation must happen before integration event recording');
}

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
