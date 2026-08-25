# Immediate completion plan

1. Normalize all authorized acquisition channels into Buyer Requests.
2. Make inbound requests idempotent and automatically create the correct staff work item.
3. Finish Facebook/Instagram production adapter and verification.
4. Add WhatsApp Business Platform adapter and map inbound product enquiries to Buyer Requests.
5. Add approved TikTok lead adapter when credentials/scopes are available.
6. Keep Jiji/Jumia/Konga behind authorized API/feed or staff-capture adapters; never scrape private buyers.
7. Complete accepted quote -> GadgetPoint integration command -> order/payment/fulfillment event loop.
8. Verify owner/staff permissions, notifications, SLA escalation and audit history.
9. Run development CI until green.
10. Merge once and perform one production deployment, then execute the end-to-end real buyer smoke test.
