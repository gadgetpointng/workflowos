# WorkflowOS launch guide

WorkflowOS is prepared for a first production launch as a Next.js web app with Supabase authentication/database and optional OpenAI features.

## 1. Create the Supabase project

Create a Supabase project, then open the SQL editor. Run `supabase/schema.sql` first and `supabase/rls.sql` second. The schema includes the owner-workspace bootstrap trigger used by `/signup`.

In Supabase Authentication settings:
- Add your production domain to Site URL.
- Add `https://YOUR-DOMAIN/auth/callback` to Redirect URLs.
- Keep email/password auth enabled.
- Decide whether email confirmation is required before the first launch.

## 2. Configure environment variables

Set these in the deployment platform:
- `NEXT_PUBLIC_APP_URL` — production origin, e.g. `https://workflowos.example.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server only; never expose to browser code
- `OPENAI_API_KEY` — optional; required for Copilot
- `CRON_SECRET` — a long random secret used by scheduled operations

## 3. Deploy to Vercel

Import this project into Vercel, add the environment variables above, and deploy. `vercel.json` schedules `/api/cron/operations` every 15 minutes for recurring work and lead SLA follow-ups.

After deployment, visit `/api/health`. A launch-ready core returns HTTP 200 with `ok: true`. The OpenAI key is reported separately because AI is optional for the core app.

## 4. Create the first workspace

Visit `/signup`, create the owner account and workspace, confirm the email if your Supabase project requires confirmation, then sign in. The database trigger creates the organization, owner profile, and default workspace settings.

From **Team**, owners/admins/managers can invite staff by email. Invited staff are provisioned into the same organization and receive the Supabase invitation flow.

## 5. Production checklist

Before announcing the app publicly:
- Run `npm run check:release` locally or in CI.
- `/api/health` returns 200.
- Owner can sign up and sign in.
- Owner can invite one staff test account.
- Test staff can sign in and only see the same organization.
- Create, assign, transition and approve a test task.
- Create a lead and confirm follow-up/SLA behavior.
- Create a recurring-work template and confirm the scheduled runner generates work.
- If using Copilot, ask a grounded question and confirm AI proposals require approval before execution.
- Create a test integration credential and verify the secret is stored only server-side.

## Known launch boundary

Marketplace connectors and direct WhatsApp transport still require official platform credentials/APIs. WorkflowOS safely queues and manages that work now; do not advertise automatic marketplace publishing or native WhatsApp message delivery until those credentials and provider integrations are configured. GadgetPoint storefront changes also require the editable GadgetPoint storefront source code.

## End-to-end sales loop test
Send a signed `whatsapp.inquiry` bridge event containing a phone number and product interest. WorkflowOS should create/update the prospect, lead, buyer intent, product matches and assigned follow-up task. Send `marketplace.demand` for anonymous/public demand; it must remain `public_signal` and must not become contactable without opt-in.
