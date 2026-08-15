# Messenger access model

Owner composer access is determined server-side by the existing owner communications endpoint. The client `owner` prop controls presentation only and is not treated as authorization.

Staff access remains their existing WorkflowOS Inbox. Direct calls to owner communications endpoints remain protected by `requireUser`, owner role, and configured owner identity checks.
