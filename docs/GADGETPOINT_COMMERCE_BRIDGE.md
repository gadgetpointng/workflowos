# GadgetPoint Admin ↔ WorkflowOS Commerce Bridge

GadgetPoint Admin remains authoritative for customer orders, payment state, stock reservation/deduction and fulfillment. WorkflowOS owns the buyer workflow and requests commerce mutations through the existing integration command bridge.

## 1. WorkflowOS requests an order

When a WorkflowOS quote is accepted, WorkflowOS creates an idempotent integration command:

- `command_type`: `order.create`
- `target_entity_type`: `quote`
- `target_entity_id`: WorkflowOS quote id
- `idempotency_key`: `quote:<quote-id>:order.create`

The payload contains:

- `workflow_quote_id`
- `quote_number`
- `currency`
- `subtotal`
- `discount_amount`
- `total_amount`
- `lead_id`
- `deal_id`
- `buyer_intent_ids`
- `customer` (`name`, `phone`, `email` when known)
- `items` (`description`, `product_ref`, `quantity`, `unit_price`, `line_total`)
- `source: workflowos_quote`

The command begins in `pending_approval`. WorkflowOS owner/manager approval moves it to `approved`.

## 2. GadgetPoint Admin pulls approved commands

Use the authenticated integration bridge endpoint:

`GET /api/bridge/gadgetpoint/commands`

WorkflowOS leases returned commands as `dispatched` so concurrent GadgetPoint workers do not process the same current lease twice. If an acknowledgement never arrives, a stale dispatch lease can be returned again after the recovery window so a lost response does not permanently strand the command.

**Adapter idempotency is mandatory across every dispatch and re-dispatch.** The WorkflowOS command `id` is the stable execution identity for the lifetime of the command and does not change when a stale lease is recovered. GadgetPoint Admin must persist that command `id` as an idempotency key before or atomically with the authoritative commerce mutation. The command `idempotency_key` is an additional stable business-operation key and must also be honored. If either key already maps to a GadgetPoint order, return/reuse that existing order instead of creating another one.

A re-dispatched command is therefore a retry of the same requested mutation, never a new order request. Adapters must not use `attempt_count`, `dispatched_at`, delivery time, or poll occurrence as an execution identity.

WorkflowOS intentionally does not impose a hard retry cap on stale dispatch recovery: eventual delivery is preferred over permanently stranding an approved command. Adapter-side idempotency by stable command `id` is what makes those retries safe.

## 3. GadgetPoint acknowledges the command

After creating the real order in GadgetPoint Admin:

`POST /api/bridge/gadgetpoint/commands`

Example body:

```json
{
  "id": "<workflowos-command-id>",
  "status": "acknowledged",
  "result": {
    "order_id": "<gadgetpoint-order-id>",
    "status": "pending_payment"
  }
}
```

For a failed command:

```json
{
  "id": "<workflowos-command-id>",
  "status": "failed",
  "error": "<safe failure message>",
  "result": {}
}
```

WorkflowOS stores the returned GadgetPoint order id on the original Buyer Request and moves the buyer to `awaiting_payment`. A failure moves the buyer to `order_request_failed` for staff attention.

## 4. GadgetPoint sends payment and fulfillment progress

Authenticated commerce workflow events can be sent to:

`POST /api/bridge/gadgetpoint/commerce`

Supported event types:

- `order.created`
- `order.updated`
- `payment.updated`

Use the same bridge authentication/signature mechanism already used by GadgetPoint integration traffic. Supply a stable event id so retries remain idempotent.

Correlation can be provided using any of:

- `data.buyer_intent_ids`
- `data.metadata.buyer_intent_ids`
- `data.workflow_quote_id`
- `data.metadata.workflow_quote_id`
- `data.order_id` / `data.external_order_id` matching the GadgetPoint order id already returned during command acknowledgement

### Payment status mapping

- `paid`, `confirmed`, `successful`, `completed` → `preparing_order`
- `failed`, `declined` → `payment_failed`
- `cancelled`, `voided` → `payment_cancelled`
- `refunded`, `reversed` → `returned`
- other/pending → `awaiting_payment`

### Order / fulfillment status mapping

- `processing`, `confirmed`, `preparing`, `packing`, `packed` → `preparing_order`
- `ready`, `ready_for_pickup`, `ready_for_delivery` → `ready_for_pickup`
- `shipped`, `out_for_delivery`, `in_transit` → `delivery`
- `delivered`, `completed`, `fulfilled` → `completed`
- `cancelled` → `cancelled`
- `returned`, `refunded` → `returned`
- other/new/pending → `awaiting_payment`

WorkflowOS sends buyer-work notifications only through the existing buyer notification preference gate.

## 5. Non-negotiable ownership boundary

WorkflowOS must never directly insert or mutate GadgetPoint Admin's authoritative order, payment or inventory records. GadgetPoint Admin executes the command and reports the result/status back. WorkflowOS stores only workflow correlation, mirrored context and operational state.
