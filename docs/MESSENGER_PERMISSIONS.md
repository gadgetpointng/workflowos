# Messenger permission enforcement

Client visibility is convenience only. The owner directory and send operations are enforced server-side. Organization ID comes from the authenticated profile, never from client input. Recipient IDs are revalidated against active profiles in that organization before delivery.
