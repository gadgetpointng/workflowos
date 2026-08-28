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
const bridge = read('lib/integrations/bridge.ts');
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
  "tracked.inProgress",
  "Commerce event is already processing",
  "advanceBuyerWorkflowFromPayment",
  "advanceBuyerWorkflowFromOrder",
  "markIntegrationEventProcessed",
  "console.error('Commerce event processing failed', error)",
  "{ error: 'Commerce event processing failed', retry: true",
]);

requireText('bridge event retry contract', bridge, [
  'EVENT_RETRY_AFTER_MS',
  ".select('id,processed_at,created_at')",
  'processed_at: null',
  "error.code === '23505'",
  'markIntegrationEventProcessed',
  '.update({ processed_at: new Date().toISOString() })',
]);

const eventIdValidation = commerce.indexOf("const eventId = String(event.id || '').trim()");
const eventRecording = commerce.indexOf('tracked = await recordIntegrationEvent');
const workflowAdvance = commerce.indexOf("const workflow = event.type === 'payment.updated'");
const eventFinalize = commerce.indexOf('await markIntegrationEventProcessed');
if (eventIdValidation === -1 || eventRecording === -1 || eventIdValidation > eventRecording) {
  failures.push('commerce route: stable event id validation must happen before integration event recording');
}
if (workflowAdvance === -1 || eventFinalize === -1 || workflowAdvance > eventFinalize) {
  failures.push('commerce route: event must only be marked processed after workflow advancement');
}

const pendingInsert = bridge.indexOf('processed_at: null');
const processedUpdate = bridge.indexOf('.update({ processed_at: new Date().toISOString() })');
if (pendingInsert === -1 || processedUpdate === -1 || pendingInsert > processedUpdate) {
  failures.push('bridge event retry contract: integration event must begin pending and be finalized separately');
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
