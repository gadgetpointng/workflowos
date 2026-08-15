# Messenger data flow

Owner composer → authenticated owner communications API → organization-scoped active profile lookup → notifications rows → activity log audit record → staff Inbox/notification surfaces.

The send is treated atomically at the application level: if the activity audit record cannot be created after notification insertion, the newly created notifications are deleted and the API returns an error.
