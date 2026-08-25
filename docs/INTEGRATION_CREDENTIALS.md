# Production integration credentials

Secrets must live in the deployment platform or integration secret store, never in source control.

## Meta / Facebook Lead Ads
- `META_APP_SECRET`
- `META_PAGE_ACCESS_TOKEN`
- `META_GRAPH_VERSION`
- `META_WEBHOOK_VERIFY_TOKEN` or workspace-stored verify token

## Normalized buyer intake adapters
- `BUYER_INTAKE_WEBHOOK_SECRET`

## WhatsApp / Instagram / TikTok
Channel-specific credentials must be added only after the corresponding official business app/account grants API or webhook access. Do not store passwords in WorkflowOS and do not scrape private users.

## GadgetPoint commerce bridge
WorkflowOS must authenticate commands/events with the existing GadgetPoint integration secret/signature mechanism. GadgetPoint Admin remains authoritative for orders, payments and inventory.
