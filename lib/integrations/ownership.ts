export type SystemOwner = 'workflowos' | 'commerce_admin' | 'storefront' | 'external_marketplace';

export type OwnershipRule = {
  domain: string;
  owner: SystemOwner;
  workflowosMode: 'authoritative' | 'mirror' | 'signal_only' | 'command_request';
  notes: string;
};

export const OWNERSHIP_RULES: OwnershipRule[] = [
  { domain: 'tasks', owner: 'workflowos', workflowosMode: 'authoritative', notes: 'WorkflowOS owns assignments, execution, approvals and completion history.' },
  { domain: 'campaigns', owner: 'workflowos', workflowosMode: 'authoritative', notes: 'WorkflowOS owns campaign planning, execution and staff work.' },
  { domain: 'crm', owner: 'workflowos', workflowosMode: 'authoritative', notes: 'WorkflowOS owns leads, follow-ups, deals, quotes and sales workflow.' },
  { domain: 'automation', owner: 'workflowos', workflowosMode: 'authoritative', notes: 'WorkflowOS owns operational rules and recommendations.' },
  { domain: 'products', owner: 'commerce_admin', workflowosMode: 'mirror', notes: 'WorkflowOS may cache product facts for context but never becomes product master.' },
  { domain: 'inventory', owner: 'commerce_admin', workflowosMode: 'mirror', notes: 'WorkflowOS consumes stock snapshots and raises work; stock changes remain in commerce admin.' },
  { domain: 'orders', owner: 'commerce_admin', workflowosMode: 'mirror', notes: 'WorkflowOS observes orders and creates work around them; order mutation stays in commerce admin.' },
  { domain: 'payments', owner: 'commerce_admin', workflowosMode: 'signal_only', notes: 'WorkflowOS may receive payment events but does not originate or settle customer payments.' },
  { domain: 'shopping_experience', owner: 'storefront', workflowosMode: 'signal_only', notes: 'Storefront owns browsing, cart, checkout and customer-facing presentation.' },
  { domain: 'marketplace_listing_state', owner: 'external_marketplace', workflowosMode: 'command_request', notes: 'WorkflowOS can request listing actions through connectors; marketplace remains source of truth.' }
];

const eventDomains: Record<string, string> = {
  'staff.upsert': 'staff_identity',
  'product.upsert': 'products',
  'inventory.updated': 'inventory',
  'order.created': 'orders',
  'order.updated': 'orders',
  'payment.updated': 'payments',
  'storefront.search': 'shopping_experience',
  'product.view': 'shopping_experience',
  'cart.added': 'shopping_experience',
  'marketplace.demand': 'marketplace_listing_state',
  'whatsapp.inquiry': 'crm',
  'site.heartbeat': 'integration'
};

export function domainForEvent(eventType: string) {
  return eventDomains[eventType] ?? 'custom';
}

export const STORE_MUTATION_COMMANDS = new Set([
  'product.create',
  'product.update',
  'product.archive',
  'inventory.adjust',
  'inventory.reserve',
  'order.create',
  'order.update_status',
  'order.cancel',
  'order.refund',
  'price.update'
]);

export function requiresExternalCommand(commandType: string) {
  return STORE_MUTATION_COMMANDS.has(commandType) || commandType.startsWith('marketplace.');
}
