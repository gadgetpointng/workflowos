# WorkflowOS owner and staff access

The only authorized WorkflowOS owner identity is `gadgetpoint.ng@gmail.com`.

## Owner

The owner enters WorkflowOS through GadgetPoint identity. The supported owner paths are:

1. GadgetPoint owner/admin sign-in, then the WorkflowOS handoff.
2. The owner-only GadgetPoint ChatGPT sign-in path, which must resolve to the exact authorized owner email above.

WorkflowOS does not maintain a separate owner password or a direct owner email-link fallback.

## Staff

Staff authenticate only through GadgetPoint staff login. Their GadgetPoint username, password, active status and role remain controlled by GadgetPoint Admin.

WorkflowOS receives a verified staff handoff and establishes its own session. Username-only staff do not need a deliverable WorkflowOS email address or a second WorkflowOS password; the bridge can create a deterministic non-delivery session identity under `staff.workflowos.invalid`.

The GadgetPoint owner identity is rejected from the staff SSO route.

## Boundary

GadgetPoint Admin runs the store and staff credentials. WorkflowOS runs the work around the store. The systems remain independent and communicate through the integration bridge.
