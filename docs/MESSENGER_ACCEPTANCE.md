# WorkflowOS messenger acceptance

- Floating message control appears above mobile navigation and bottom-right on desktop.
- Owner opens an inline Admin-style composer without leaving the current page.
- Owner can select Private or Team mode subject to Owner Control switches.
- Private mode loads only active staff in the same organization.
- Sending uses the protected `/api/owner/communications` endpoint and creates existing WorkflowOS notifications/activity logs.
- Staff floating control routes to Inbox and does not expose owner-only API data.
- Messenger uses the Admin visual tokens: `#08111f`, `#2377ff`, `#f5f6f8`, `#e4e7ec`.
- Full communications remains available at `/owner-communications`.
