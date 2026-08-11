# WorkflowOS

WorkflowOS is the operating workspace around GadgetPoint: execution, opportunities, communications, approvals, automation, analytics and connected commerce without duplicating the responsibilities of GadgetPoint Admin.

## Product boundary

- GadgetPoint Admin remains the store and staff identity source of truth.
- WorkflowOS runs work around the store: tasks, growth, follow-up, communications, approvals, intelligence and integrations.
- The systems connect through controlled integrations rather than overlapping administration.

## Owner control pattern

WorkflowOS uses two distinct control patterns so owner actions stay clear:

- **Yes / No switches** are persistent business policies. They use iPhone-style On/Off controls and apply to the organization.
- **Action buttons** perform one-time work such as Send, Assign, Approve, Reject or Retract.
- A message retraction is called **Retract**, not Undo, so it is never confused with a Yes / No switch.

Current organization-level owner communication switches include Team Feed, Private Staff Messages, Read Receipts and Message Retraction. Policy changes are recorded in the activity log.

## Interface direction

The product uses a mature enterprise/banking visual system: Inter typography, restrained navy/slate/white surfaces, tabular operational figures, controlled status colors, spacious option groups and tactile iPhone-style controls.

## Deployment

The repository supports Vercel and includes a Netlify configuration as a free deployment fallback. Keep deployment secrets in the hosting provider environment rather than committing them to the repository.

See `LAUNCH.md`, `ARCHITECTURE_BOUNDARIES.md`, and the deployment documentation under `docs/` for operational details.
