# Messenger test matrix

| Actor | Action | Expected |
| --- | --- | --- |
| Owner | Open floating button | Inline composer opens |
| Owner | Private send | Active same-org staff receives notification |
| Owner | Team send | Active staff receive notifications |
| Owner | Disabled private control | Private mode unavailable/server rejects |
| Owner | Disabled team feed | Team mode unavailable/server rejects |
| Staff | Open floating button | Routes to Inbox |
| Staff | Call owner GET/POST directly | 403 |
| Mobile | Open messenger | Composer stays above bottom navigation |
| Desktop | Collapse sidebar | Messenger remains fixed bottom-right |
