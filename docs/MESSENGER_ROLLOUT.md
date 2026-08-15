# Messenger rollout

1. Require Messenger Verify and the repository verification checks to pass on the exact PR head.
2. Require a Vercel preview for that exact head to reach READY.
3. Confirm the branch is zero commits behind current main and mergeable.
4. Squash-merge.
5. Confirm production deployment reaches READY and `/api/health` returns 200 with `ok: true`.
6. Smoke-test owner composer and staff Inbox routing in authenticated sessions.
