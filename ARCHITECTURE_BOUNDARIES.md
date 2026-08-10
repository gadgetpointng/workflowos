# WorkflowOS system boundaries

This is a non-negotiable architecture rule.

## GadgetPoint Admin / commerce admin
Authoritative for products, inventory, pricing, POS, store orders, refunds and customer-payment state.
WorkflowOS may store read-only mirrors required for context, analytics and work generation.

## WorkflowOS
Authoritative for tasks, execution, staff capabilities, workload, CRM workflow, campaigns, approvals, automations, recommendations, AI proposals, SLA, schedules and operational reporting.

## Storefront
Authoritative for customer-facing browsing, search, cart, checkout UI and shopping presentation. It emits behavioral signals to WorkflowOS.

## Integration rule
Connected systems publish facts as events. WorkflowOS reacts to those facts.
If WorkflowOS needs a source-owned record changed, it creates an `integration_commands` request. A manager approves it, the source system pulls it, performs the mutation in its own database, and acknowledges the result.

WorkflowOS must never create a second authoritative product, inventory, order or payment system for GadgetPoint.


## Enforced release guard
`npm run check:boundaries` scans application/server code and fails if source-owned `connected_products` or `connected_orders` mirrors are mutated outside the authenticated bridge ingestion routes. This turns the separation rule into a release check instead of relying on convention alone.

## Connector capabilities
Each external integration declares whether it can publish `events` and/or receive approved `commands`. Website/messaging integrations default to event-only; commerce/marketplace integrations can support both. Command delivery is claimed atomically by status so concurrent connector polls do not intentionally dispatch the same approved request twice.
