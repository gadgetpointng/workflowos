# Buyer Acquisition Release Gate

WorkflowOS is release-ready only when the buyer journey works end to end without creating a second commerce authority.

## Acquisition
- [x] Public GadgetPoint buyer request intake
- [x] Facebook Lead Ads webhook endpoint
- [x] Normalized signed inbound buyer webhook for approved channel adapters
- [x] Source queues for Facebook, Facebook Marketplace, Instagram, WhatsApp, TikTok, Jiji, Jumia, Konga, Google, Website, Phone, Referral and Walk-in
- [ ] Meta production credentials verified and real lead test received
- [ ] WhatsApp Business adapter credentials connected and real message/request test received
- [ ] Instagram production webhook/subscription verified
- [ ] TikTok approved integration connected if account/API access permits
- [ ] Marketplace adapters connected only where an authorized API/feed is available; otherwise use staff capture/deep-link workflow (no private-user scraping)

## Buyer operations
- [x] Buyer request scoring and live inventory matching
- [x] Buyer request to staff task
- [x] Sourcing-required stage
- [x] Supplier offer/cost/selling-price/margin capture
- [x] Quotation preparation and quote status reflected back to buyer request
- [ ] SLA timers and escalation verified with real staff accounts
- [x] Duplicate inbound buyer prevention verified per source/external ID
  - 2026-08-28 production verification: `buyer_intents` enforces `unique (organization_id, source, external_ref)` and has no duplicate non-null external references. Shared inbound capture now writes `external_ref`, pre-checks the same key, and converts concurrent unique-key races into the existing buyer request instead of creating duplicate tasks/notifications.

## Commerce bridge
- [x] Accepted quote creates an idempotent `order.create` request for the GadgetPoint integration command bridge
- [x] GadgetPoint command acknowledgement advances the same buyer request to payment waiting and stores the external order reference when supplied
- [x] Authenticated commerce callback accepts correlated `order.created`, `order.updated` and `payment.updated` workflow events without making WorkflowOS the commerce authority
- [x] Inventory reservation/deduction remains owned by GadgetPoint Admin
- [x] Buyer workflow mapping exists for payment confirmed/failed/cancelled, preparation, ready, delivery, completion, cancellation and return/refund
- [ ] Real GadgetPoint Admin order-create command pull/acknowledgement smoke test completed
- [ ] Real payment event received from GadgetPoint Admin
- [ ] Real pickup/delivery event received from GadgetPoint Admin
- [ ] Cancellation, failed payment, return and completion states smoke-tested against the real bridge

## Owner/staff
- [x] Owner-only identity route and managed GadgetPoint staff identity model
- [x] Public signup disabled
- [ ] Staff assignment, notification, private owner message and announcement tested end to end
- [x] Role/RLS audit completed
  - 2026-08-27 production audit: every `public` table has RLS enabled; buyer, task, quote, customer, integration, identity and notification policies are organization-scoped; no `public` `SECURITY DEFINER` function is executable by `anon` or `authenticated`; `facebook_lead_events` remains intentionally server-only with no client policy and direct `anon`/`authenticated` grants revoked.

## Production gate
- [ ] Development CI green on the final branch head
- [ ] Supabase migrations/RLS green
- [ ] One consolidated merge to main
- [ ] One production deployment after Vercel quota is available
- [ ] /api/health = 200/ok
- [ ] Owner login -> dashboard persists
- [ ] Staff login -> permitted workspace only
- [ ] /request creates buyer request
- [ ] Facebook webhook verification succeeds
- [ ] Real buyer -> task -> inventory/sourcing -> quote -> order -> payment -> fulfillment -> completed smoke test
