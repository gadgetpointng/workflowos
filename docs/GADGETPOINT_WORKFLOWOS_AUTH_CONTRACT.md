# GadgetPoint ↔ WorkflowOS authentication contract

## Trust boundaries

GadgetPoint remains the authority for its owner identity, staff credentials, inventory, orders and POS. WorkflowOS receives verified identity only and creates an independent WorkflowOS session. Passwords and password hashes never cross the bridge.

## GadgetPoint to WorkflowOS

- Issuer: `https://gadgetpoint.ng/auth/v1`
- Audience: `authenticated`
- JWKS: `https://gadgetpoint.ng/auth/v1/.well-known/jwks.json`
- Server receiver: `POST https://workflow.gadgetpoint.ng/api/auth/gadgetpoint/sso`
- Browser callback: `GET https://workflow.gadgetpoint.ng/auth/gadgetpoint/owner?code=…`
- Algorithm: ES256 with required `kid`
- Token lifetime: at most 90 seconds; `iat`, `nbf`, `exp`, and unique `jti` are required
- Claims: `iss`, `aud`, `sub`, `email`, `iat`, `nbf`, `exp`, `jti`, owner/staff metadata
- Owner: access is granted only when verified `sub` and `email` are exactly `gadgetpoint.ng@gmail.com`, role is `owner`, and status is active
- Staff: GadgetPoint remains credential owner; only verified identity, branch/department and permissions cross the bridge
- Replay: WorkflowOS claims `jti` once and returns a different random, hashed, single-use browser code expiring in two minutes

## WorkflowOS to GadgetPoint

WorkflowOS links owners to `https://gadgetpoint.ng/admin`. GadgetPoint Admin continues to use its platform-managed ChatGPT identity and exact owner allowlist. WorkflowOS does not mint or replace that session. When the session is absent, GadgetPoint's real `/owner-login` route starts platform authentication. No second GadgetPoint password/session system is created.

## Failures and logout

Missing, expired, modified, wrong-issuer, wrong-audience, wrong-email, inactive, and replayed handoffs are denied without creating a session. Logs record only a short SHA-256 token fingerprint. Logging out of one product does not create, revive, or silently terminate the other product's independent session.

## Production tests

1. Verified owner from GadgetPoint reaches WorkflowOS `/dashboard`.
2. Wrong email is denied.
3. Expired token is denied.
4. Modified token is denied.
5. Reused `jti` is denied.
6. Anonymous `https://gadgetpoint.ng/admin` shows GadgetPoint login, not storefront.
7. Logout from either product does not authenticate the other.
