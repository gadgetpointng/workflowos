# Messenger security boundaries

The floating messenger reuses WorkflowOS's authenticated owner communications endpoint.

- GET and POST owner communications require the authenticated owner profile and configured owner email.
- Staff never receive the owner staff-directory payload; their floating action routes to Inbox.
- Recipient lookup is scoped to the current organization and active profiles.
- Owner Control settings continue to gate private messages and team feed.
- Existing notification and activity-log writes remain the delivery/audit mechanism.
- No new public messaging endpoint or client-side service-role credential is introduced.
