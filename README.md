# WorkflowOS

WorkflowOS is a browser-first business execution web app for teams, tasks, approvals, campaigns, CRM, customer conversations, recurring work, SLAs, analytics, controlled AI actions, marketplace operations, vendors, commission commerce and multi-site integrations.

The product is standalone by design. GadgetPoint is the first deep integration, while the same integration/event architecture can support other websites and businesses.

## Run locally

1. Copy `.env.example` to `.env.local` and fill the Supabase values.
2. Run `supabase/schema.sql`, then `supabase/rls.sql` in the Supabase SQL editor.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.
5. Open `/signup` to create the first owner workspace.

## Launch

See `LAUNCH.md` for the production deployment checklist and environment setup.

## Architecture boundaries

- WorkflowOS: staff execution, campaigns, CRM, automation, AI decision support, marketplace operations and integrations.
- GadgetPoint Admin: retail inventory/POS/order operations.
- GadgetPoint Storefront: customer-facing commerce and WhatsApp entry point.

These systems can share identity and selected operational data without collapsing into a single application.

## System boundary rule
WorkflowOS is independent from GadgetPoint Admin and the storefront, but connected through integration events and approved command requests. See `ARCHITECTURE_BOUNDARIES.md`.

### Buyer Intelligence
WorkflowOS can capture consented buyer enquiries and public demand signals, score purchase intent, match demand against read-only connected product mirrors, and convert opted-in buyers into CRM leads. Product, stock, pricing and order ownership remain in the connected commerce system (for GadgetPoint, GadgetPoint Admin).

## Live sales loop
The integration bridge now turns opted-in WhatsApp inquiries into a connected customer/lead, Buyer Intelligence record, product matches against the read-only GadgetPoint catalog mirror, a recommended sales assignee, and a follow-up task. Public marketplace demand is captured as non-contactable Buyer Intelligence until consent exists. Commerce ownership remains in GadgetPoint Admin.

## Storefront demand intelligence
Anonymous GadgetPoint storefront views, cart additions and meaningful searches are recorded as commerce signals. WorkflowOS aggregates those weak signals over a rolling window and creates or refreshes ranked growth recommendations only after demand crosses a useful threshold. The Opportunity Center remains the human decision point: recommendations can be accepted and converted into tasks without turning ordinary browsing activity into task spam or transferring store administration into WorkflowOS.
