# Implementation notes

This change deliberately does not introduce a new chat database model. It composes on top of the existing WorkflowOS owner communications notification/activity-log path so the first production version stays compatible with current staff Inbox, permissions and audit behavior.

A future threaded-chat model can be added behind the same floating UI without weakening the current owner/staff boundary.
