-- Default inventory event automations for GadgetPoint-backed stock.
-- Idempotent by organization + rule name so this can be safely reapplied.

insert into public.automation_rules (
  organization_id,
  name,
  trigger_event,
  action_type,
  conditions,
  action_config,
  capability,
  priority,
  active
)
select
  o.id,
  'Create operations task for low stock',
  'inventory.updated',
  'create_task',
  jsonb_build_object('source', 'gadgetpoint', 'stock_quantity_lte', 3),
  jsonb_build_object(
    'cooldown_minutes', 720,
    'title_template', 'Restock {{name}}',
    'description_template', '{{name}} ({{sku}}) has {{stock_quantity}} units remaining in GadgetPoint Admin. Review stock and arrange replenishment or a branch transfer.'
  ),
  'operations',
  'high',
  true
from public.organizations o
where not exists (
  select 1 from public.automation_rules r
  where r.organization_id = o.id
    and r.name = 'Create operations task for low stock'
);

insert into public.automation_rules (
  organization_id,
  name,
  trigger_event,
  action_type,
  conditions,
  action_config,
  capability,
  priority,
  active
)
select
  o.id,
  'Escalate out of stock to owner',
  'inventory.updated',
  'create_notification',
  jsonb_build_object('source', 'gadgetpoint', 'stock_quantity_lte', 0),
  jsonb_build_object(
    'cooldown_minutes', 720,
    'recipient_role', 'owner',
    'title_template', 'Out of stock: {{name}}',
    'description_template', '{{name}} ({{sku}}) is now out of stock in GadgetPoint Admin. Review replenishment or move stock from another branch.'
  ),
  'operations',
  'urgent',
  true
from public.organizations o
where not exists (
  select 1 from public.automation_rules r
  where r.organization_id = o.id
    and r.name = 'Escalate out of stock to owner'
);
