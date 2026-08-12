# WorkflowOS

WorkflowOS is a browser-first business execution web app for teams, tasks, approvals, campaigns, CRM, customer conversations, recurring work, SLAs, analytics, controlled AI actions, marketplace operations, vendors, commission commerce and multi-site integrations.

The product is standalone by design. GadgetPoint is the first deep integration, while the same integration/event architecture can support other websites and businesses.

## Run locally

1. Copy `.env.example` to `.env.local` and fill the Supabase values.
2. Run `supabase/schema.sql`, then `supabase/rls.sql`, then `supabase/security-hardening.sql`, then `supabase/performance-indexes.sql` in the Supabase SQL editor. Security hardening must run after the base RLS template so inactive staff are denied at the database layer and identity helpers remain outside the exposed API schema; the index script then adds the focused indexes used by current production paths.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.
5. Open `/login`. WorkflowOS does not use public account creation; GadgetPoint identity is the access source for the production workspace.

## Identity and access

- Authorized owner identity: `gadgetpoint.ng@gmail.com` only.
- Owner access: GadgetPoint owner/admin handoff or the owner-only GadgetPoint ChatGPT path.
- Staff access: GadgetPoint staff login only. GadgetPoint owns staff usernames, passwords, active status and roles.
- Username-only staff do not need a deliverable WorkflowOS email address or a second WorkflowOS password.
- `/signup` does not create accounts; it redirects users back to the managed login flow.

See `docs/OWNER_ACCESS.md` for the identity boundary.

## Launch

See `LAUNCH.md` for the production deployment checklist and environment setup.

## Architecture boundaries

- WorkflowOS: staff execution, campaigns, CRM, automation, AI decision support, marketplace operations and integrations.
- GadgetPoint Admin: retail inventory/POS/order operations and staff credential ownership.
- GadgetPoint Storefront: customer-facing commerce and WhatsApp entry point.

These systems can share identity and selected operational data without collapsing into a single application.

## System boundary rule
WorkflowOS is independent from GadgetPoint Admin and the storefront, but connected through integration events and approved command requests. See `ARCHITECTURE_BOUNDARIES.md`.

### Buyer Intelligence
WorkflowOS can capture consented buyer enquiries and public demand signals, score purchase intent, match demand against read-only connected product mirrors, and convert opted-in buyers into CRM leads. Product, stock, pricing and order ownership remain in the connected commerce system (for GadgetPoint, GadgetPoint Admin).

## Public buyer request

`/request` is a public, no-account GadgetPoint enquiry path. It captures genuine product requests with contact permission, source/campaign attribution and live catalog matching. It does not create a WorkflowOS account, accept payment or take over checkout/inventory from GadgetPoint.

## Live sales loop
The integration bridge can turn opted-in inquiries into connected customer/lead work, Buyer Intelligence records, product matches against the read-only GadgetPoint catalog mirror, recommended sales ownership and follow-up tasks. Public marketplace demand remains non-contactable until consent exists. Commerce ownership remains in GadgetPoint Admin.

## Storefront demand intelligence
Anonymous GadgetPoint storefront views, cart additions and meaningful searches are recorded as commerce signals. WorkflowOS aggregates those weak signals over a rolling window and creates or refreshes ranked growth recommendations only after demand crosses a useful threshold. The Opportunity Center remains the human decision point: recommendations can be accepted and converted into tasks without turning ordinary browsing activity into task spam or transferring store administration into WorkflowOS.

<!-- Production deployment retrigger: 2026-08-12. No application behavior changed. -->
<!-- Production deployment retry after free-build cooldown: 2026-08-12 07:45 UTC. No application behavior changed. -->
<!-- Owner-access production retry after deployment capacity returned: 2026-08-12 20:56 UTC. -->
