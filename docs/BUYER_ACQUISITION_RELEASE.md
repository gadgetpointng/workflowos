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
- [ ] Duplicate inbound buyer prevention verified per source/external ID

## Commerce bridge
- [ ] Accepted quote requests a real GadgetPoint order through the integration command bridge
- [ ] Payment status returns from GadgetPoint Admin to WorkflowOS
- [ ] Inventory reservation/deduction remains owned by GadgetPoint Admin
- [ ] Pickup/delivery status returns to WorkflowOS
- [ ] Cancellation, failed payment, return and completion states tested

## Owner/staff
- [x] Owner-only identity route and managed GadgetPoint staff identity model
- [x] Public signup disabled
- [ ] Staff assignment, notification, private owner message and announcement tested end to end
- [ ] Role/RLS audit completed

## Production gate
- [ ] Development CI green
- [ ] Supabase migrations/RLS green
- [ ] One consolidated merge to main
- [ ] One production deployment after Vercel quota is available
- [ ] /api/health = 200/ok
- [ ] Owner login -> dashboard persists
- [ ] Staff login -> permitted workspace only
- [ ] /request creates buyer request
- [ ] Facebook webhook verification succeeds
- [ ] Real buyer -> task -> inventory/sourcing -> quote -> order -> payment -> fulfillment -> completed smoke test
