# WorkflowOS on Netlify

WorkflowOS is configured to run on Netlify as a production-capable backup host for the existing Vercel deployment.

## Build

Netlify should connect directly to `gadgetpointng/workflowos` and deploy the `main` branch.

- Build command: `npm run build`
- Publish directory: `.next`
- Node.js: 20
- Next.js adapter: use Netlify automatic OpenNext support; do not pin `@netlify/plugin-nextjs` unless troubleshooting requires it.

## Required environment variables

Configure these in Netlify Site configuration > Environment variables. Do not commit their values to GitHub.

- `NEXT_PUBLIC_APP_URL` — set to the final Netlify production URL (and update again if a custom domain is attached)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` — keep the same long secret used by WorkflowOS scheduled operations, or rotate deliberately across all callers

Optional:

- `OPENAI_API_KEY` — enables WorkflowOS Copilot

## Production verification

After the first deploy:

1. Open `/api/health` and require HTTP 200 with `ok: true`.
2. Verify Supabase database connectivity is true.
3. Test owner sign-in and GadgetPoint staff handoff.
4. Test Inbox and Notifications.
5. Test an authenticated API route.
6. Verify the mobile dock renders Home, Opportunities, Tasks, Inbox, and More.

## Domain strategy

Keep Vercel available during migration. Move a custom WorkflowOS domain only after Netlify passes the health and authentication checks. This keeps rollback immediate and avoids making either hosting provider a single point of failure.
