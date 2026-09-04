# Buyer intake adapter contract

Approved channel adapters can submit normalized buyer demand to `/api/integrations/buyer-intake/webhook`.

Requests must be JSON and include `organization_id`, `source`, and `product_query`. Sign the exact raw request body with HMAC-SHA256 using `BUYER_INTAKE_WEBHOOK_SECRET` and send it as `x-workflowos-signature: sha256=<hex digest>`.

Supported normalized sources: `facebook`, `facebook_marketplace`, `instagram`, `whatsapp`, `tiktok`, `jiji`, `jumia`, `konga`, `google`, `website`, `phone`, `referral`, `walk_in`, `other`.

Optional fields: `external_id`, `buyer_name`, `phone`, `email`, `category`, `brand`, `model`, `budget_max`, `city`, `state`, `urgency`, `consent_status`, `assigned_to`, `auto_create_task`, and `evidence`.

`external_id` is used for source-level duplicate protection. The pipeline matches live GadgetPoint inventory, scores the request, creates a Buyer Intelligence record, creates a work task by default, and notifies the assigned staff member or owner.

This endpoint is an adapter boundary, not permission to scrape private marketplace users. Channel-specific adapters must use official/authorized APIs, webhooks, exports or staff-entered genuine enquiries and must preserve the buyer's contact-consent state.
