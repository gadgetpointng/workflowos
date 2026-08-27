# Production integration credentials

Secrets must live in the deployment platform or integration secret store, never in source control. Non-secret routing identifiers should also be configured explicitly so inbound events are assigned to the intended GadgetPoint workspace.

## Shared buyer acquisition routing
- `GADGETPOINT_WORKSPACE_ID` — organization/workspace that receives WhatsApp and Instagram buyer messages.

## Meta / Facebook Lead Ads
- `META_APP_SECRET`
- `META_PAGE_ACCESS_TOKEN`
- `META_GRAPH_VERSION`
- Workspace-stored Facebook webhook verify token is preferred. `META_WEBHOOK_VERIFY_TOKEN` remains a compatibility fallback where supported.

## Normalized buyer intake adapters
- `BUYER_INTAKE_WEBHOOK_SECRET`

## WhatsApp Business webhook
- `META_APP_SECRET` — validates `x-hub-signature-256` on inbound Meta webhook payloads.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — required for Meta webhook subscription verification.
- `GADGETPOINT_WORKSPACE_ID` — routes accepted messages into the GadgetPoint organization.

## Instagram Business webhook
- `META_APP_SECRET` — validates `x-hub-signature-256` on inbound Meta webhook payloads.
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` — preferred verification token for Instagram webhook subscription.
- `META_WEBHOOK_VERIFY_TOKEN` — optional compatibility fallback when an Instagram-specific token is not configured.
- `GADGETPOINT_WORKSPACE_ID` — routes accepted messages into the GadgetPoint organization.

## TikTok and other channels
Channel-specific credentials must be added only after the corresponding official business app/account grants API or webhook access. Do not store passwords in WorkflowOS and do not scrape private users. Every new adapter must update this credential contract and its release verification before production activation.

## GadgetPoint commerce bridge
WorkflowOS must authenticate commands/events with the existing GadgetPoint integration secret/signature mechanism. GadgetPoint Admin remains authoritative for orders, payments and inventory.
