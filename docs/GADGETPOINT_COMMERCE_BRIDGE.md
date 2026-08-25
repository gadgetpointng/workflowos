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

Only approved commands are returned. WorkflowOS leases each returned command as `dispatched` so concurrent GadgetPoint workers do not process the same approved request twice.

GadgetPoint Admin must treat the command id and idempotency key as idempotent. If the real GadgetPoint order already exists for the command, return the existing order instead of creating a duplicate.

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
