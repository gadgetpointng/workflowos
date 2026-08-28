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
const commerceWorkflow = read('lib/integrations/commerce-workflow.ts');
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
  "console.error('Could not load approved integration commands', approvedError)",
  "{ error: 'Could not load integration commands' }",
  "console.error('Could not load integration command', commandError)",
  "{ error: 'Could not load integration command' }",
  "console.error('Could not finalize integration command acknowledgement', error)",
  "{ error: 'Could not finalize integration command acknowledgement', retry: true }",
]);

requireText('commands dispatch retry contract', commands, [
  'const COMMAND_DISPATCH_RETRY_AFTER_MS = 15 * 60 * 1000',
  'const staleBefore = new Date(Date.now() - COMMAND_DISPATCH_RETRY_AFTER_MS).toISOString()',
  ".eq('status', 'dispatched')",
  ".lt('dispatched_at', staleBefore)",
  "const candidates = [...(staleDispatched ?? []), ...(approved ?? [])]",
  ".eq('status', row.status)",
  ".eq('updated_at', row.updated_at)",
  "if (row.status === 'dispatched') leaseQuery = leaseQuery.lt('dispatched_at', staleBefore)",
  'const { data: leased, error: leaseError }',
  "console.error('Could not lease integration command for dispatch', leaseError)",
  "{ error: 'Could not dispatch integration commands', retry: true }",
]);

requireText('commands acknowledgement retry contract', commands, [
  "select('id,command_type,target_entity_type,target_entity_id,payload,status,updated_at')",
  "command.status !== 'dispatched' && command.status !== body.status",
  "Command status conflicts with this acknowledgement",
  'const processingAt = new Date().toISOString()',
  'const { data: lease, error: leaseError }',
  ".eq('updated_at', command.updated_at)",
  'Command acknowledgement is already processing',
  'const { data: intents, error: intentsError }',
  "if (intentsError) throw new Error('Could not resolve buyer intents for commerce command')",
  'const { error: intentUpdateError }',
  "if (intentUpdateError) throw new Error('Could not update buyer intent from commerce command')",
  'id: deterministicUuid(`commerce-command-notification:${command.id}:${intent.id}:${body.status}`)',
  "notificationError && notificationError.code !== '23505'",
  'id: deterministicUuid(`commerce-command-activity:${command.id}:${body.status}`)',
  "activityError && activityError.code !== '23505'",
  ".eq('updated_at', processingAt)",
  'replayed: command.status === body.status',
]);

forbidText('commands route error privacy', commands, [
  '{ error: error.message }',
  "commandError?.message || 'Command not found'",
]);

forbidText('commands route ignored dispatch errors', commands, [
  'const { data: leased } = await leaseQuery',
]);

forbidText('commands route ignored side-effect errors', commands, [
  "const { data: intents } = await auth.supabase.from('buyer_intents')",
  "\n      await auth.supabase.from('buyer_intents').update({",
  "\n        await auth.supabase.from('notifications').insert({",
  "\n    await auth.supabase.from('activity_logs').insert({",
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
  "advanceBuyerWorkflowFromPayment(auth.supabase, auth.integration.organization_id, data, tracked.eventId)",
  "advanceBuyerWorkflowFromOrder(auth.supabase, auth.integration.organization_id, data, tracked.eventId)",
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

requireText('commerce workflow fail-closed database handling', commerceWorkflow, [
  "const { data: intents, error } = await supabase.from('buyer_intents')",
  "if (error) throw new Error('Could not resolve buyer intents for commerce workflow')",
  "const { error } = await supabase.from('notifications').insert({",
  "if (error && error.code !== '23505') throw new Error('Could not create commerce workflow notification')",
  "if (error) throw new Error('Could not update buyer intent from commerce order')",
  "if (error) throw new Error('Could not update buyer intent from commerce payment')",
]);

requireText('commerce workflow notification idempotency', commerceWorkflow, [
  "import crypto from 'crypto'",
  'function notificationId(eventId: string, intentId: string, stage: string)',
  "crypto.createHash('sha256').update(`${eventId}:${intentId}:${stage}`)",
  'id: notificationId(eventId, intent.id, stage)',
  'commerce_stage_event_id: eventId',
  "const retryingSameStageEvent = previousStage === stage && String(evidence.commerce_stage_event_id ?? '') === eventId",
  'if (stage !== previousStage || retryingSameStageEvent) await notifyStage(supabase, organizationId, intent, stage, eventId)',
  'advanceBuyerWorkflowFromOrder(supabase: SupabaseLike, organizationId: string, data: any, eventId: string)',
  'advanceBuyerWorkflowFromPayment(supabase: SupabaseLike, organizationId: string, data: any, eventId: string)',
]);

forbidText('commerce workflow ignored database errors', commerceWorkflow, [
  "const { data: intents } = await supabase.from('buyer_intents')",
  "\n  await supabase.from('notifications').insert({",
  "\n    await supabase.from('buyer_intents').update(update).eq('id', intent.id);",
]);

const dispatchStaleLoad = commands.indexOf(".eq('status', 'dispatched')");
const dispatchCandidateMerge = commands.indexOf('const candidates =');
const dispatchLease = commands.indexOf(".eq('status', row.status)");
const dispatchLeaseError = commands.indexOf("console.error('Could not lease integration command for dispatch', leaseError)");
if (dispatchStaleLoad === -1 || dispatchCandidateMerge === -1 || dispatchLease === -1 || dispatchLeaseError === -1 || dispatchStaleLoad > dispatchCandidateMerge || dispatchCandidateMerge > dispatchLease || dispatchLease > dispatchLeaseError) {
  failures.push('commands route: stale dispatched commands must be loaded, merged, compare-and-swap leased, and fail closed on lease errors');
}

const commandLease = commands.indexOf('const { data: lease, error: leaseError }');
const commandEffects = commands.indexOf("if (command.command_type === 'order.create')");
const commandFinalize = commands.indexOf("const patch = body.status === 'acknowledged'");
if (commandLease === -1 || commandEffects === -1 || commandFinalize === -1 || commandLease > commandEffects || commandEffects > commandFinalize) {
  failures.push('commands route: acknowledgement must lease first, run retry-safe side effects second, and finalize command status last');
}

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

const notificationInsert = commerceWorkflow.indexOf("const { error } = await supabase.from('notifications').insert({");
const deterministicNotificationId = commerceWorkflow.indexOf('id: notificationId(eventId, intent.id, stage)');
const duplicateNotificationHandling = commerceWorkflow.indexOf("error.code !== '23505'");
if (notificationInsert === -1 || deterministicNotificationId === -1 || duplicateNotificationHandling === -1 || deterministicNotificationId < notificationInsert || duplicateNotificationHandling < notificationInsert) {
  failures.push('commerce workflow: stage notifications must use deterministic event-scoped ids and tolerate duplicate-key retries');
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

requireText('bridge redispatch idempotency documentation', docs, [
  'The WorkflowOS command `id` is the stable execution identity for the lifetime of the command',
  'A re-dispatched command is therefore a retry of the same requested mutation, never a new order request.',
  'Adapters must not use `attempt_count`, `dispatched_at`, delivery time, or poll occurrence as an execution identity.',
  'WorkflowOS intentionally does not impose a hard retry cap on stale dispatch recovery',
  'persist that command `id` as an idempotency key before or atomically with the authoritative commerce mutation',
]);

if (failures.length) {
  console.error('Commerce bridge contract gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commerce bridge contract gate passed.');