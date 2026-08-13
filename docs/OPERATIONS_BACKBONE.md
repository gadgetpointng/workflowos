# GadgetPoint + WorkflowOS operations backbone

## Goal

GadgetPoint Admin and WorkflowOS are two interfaces over one operating model, not two competing systems. Every domain has exactly one authoritative owner. Mirrors are read-only context. Mutations cross the boundary as explicit commands with audit state.

## Ownership

| Domain | Authority | WorkflowOS role |
| --- | --- | --- |
| Products, SKU, price, cost | GadgetPoint Admin | Read-only mirror |
| Branch inventory and aggregate stock | GadgetPoint Admin | Read-only mirror + approved adjustment requests |
| Orders and payments | GadgetPoint Admin | Signals, follow-up work, analytics |
| Staff commerce identity | GadgetPoint Admin | Mirrored identity mapped to WorkflowOS profiles |
| Staff operational tasks | WorkflowOS | Authority |
| Approvals and execution history | WorkflowOS | Authority |
| Leads, deals, follow-ups, campaigns | WorkflowOS | Authority unless sourced externally |
| Staff messenger records | GadgetPoint Admin | Future read-only mirror + outbound command requests |

## Inventory invariants

1. WorkflowOS must never directly update authoritative stock.
2. A WorkflowOS stock request starts as `pending_approval`.
3. A manager/owner approval is required before the connector can dispatch an `inventory.adjust` command.
4. GadgetPoint Admin independently validates product, branch, integer delta, maximum adjustment, and non-negative resulting stock.
5. GadgetPoint Admin updates branch stock and aggregate product stock together, records an audit entry, then acknowledges or fails the command.
6. WorkflowOS displays Admin stock as a mirror and must identify stale snapshots. A snapshot older than 30 minutes is operational context, not a live count.
7. Failed commands are visible and never treated as completed work.

## Messaging target architecture

Admin's existing `staff_messages` record remains the single source of truth. WorkflowOS must not create a parallel private-message database with different history or read state.

The safe transport is the existing server-to-server integration boundary:

- Admin publishes message-created/read/deleted events to WorkflowOS.
- WorkflowOS stores only a participant-scoped mirror protected by row-level security.
- WorkflowOS replies become explicitly typed outbound integration commands.
- Admin validates the sender/recipient against active staff and applies the message to `staff_messages`.
- Admin publishes the resulting authoritative message event back to WorkflowOS.
- Read receipts follow the same round trip.
- Attachments remain in Admin's object store; WorkflowOS receives only authorized attachment metadata/access paths.

### Non-negotiable privacy condition

Do not ship the shared messenger until the message mirror has participant-level RLS: owner may read all company staff messages; a staff user may read only messages where their normalized email is sender or recipient. No org-wide fallback policy is acceptable for private chat.

## Command-bus rules

- Every external mutation has a typed command name.
- Consumers must claim only command types they implement. A domain worker must never consume another domain's command and mark it failed simply because it does not recognize it.
- Claims need a recoverable delivery lease so a consumer crash does not leave a command permanently `dispatched`.
- Retries must be bounded and visible.
- Every command must end in `acknowledged`, `failed`, or `cancelled`.
- Idempotency keys are required for operations that can be retried by a user or network.

## Observability

For every bridge operation capture at least:

- source system and integration slug;
- event/command id;
- command type;
- requested, approved, dispatched, acknowledged/failed timestamps;
- attempt count and last error;
- authoritative record id;
- branch id for inventory work;
- actor identity for human-triggered mutations.

The UI should surface three states separately: connection health, mirror freshness, and command failures. A green connection badge must not imply that mirrored data is fresh.

## Release order for paired changes

1. Add/verify receiver capability first.
2. Deploy receiver.
3. Deploy sender/UI.
4. Run a no-op or low-risk end-to-end test.
5. Confirm audit trail and authoritative record.
6. Only then enable broad staff use.

This ordering prevents WorkflowOS from emitting work that Admin cannot yet process.

## Definition of done

A cross-system feature is done only when its source of truth is explicit, its mutation path is authenticated and auditable, stale/error states are visible, retries are idempotent, both repositories have automated verification, production deployment is verified, and the real end-to-end action has been observed on the authoritative side.
