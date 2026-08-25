# Channel adapter standards

All acquisition channels normalize into one Buyer Request contract before business workflow begins.

| Channel | Preferred intake | Contact policy |
| --- | --- | --- |
| Facebook Lead Ads | Meta webhook + Graph API | Lead form consent mapped to buyer consent |
| Facebook Marketplace | Authorized Meta/business integration when available; otherwise staff capture | Do not scrape profiles/messages |
| Instagram | Meta webhook/business messaging integration | Preserve message/lead consent context |
| WhatsApp | WhatsApp Business Platform webhook | Only business-authorized conversations |
| TikTok | Approved TikTok business/lead integration | Use granted API scopes only |
| GadgetPoint website | Native `/request` intake | Explicit contact permission on form |
| Google | Approved lead/business integration or staff capture | Preserve source/evidence |
| Jiji/Jumia/Konga | Authorized seller/API/feed where available; otherwise staff capture | No private-user scraping |
| Phone/referral/walk-in | Staff capture | Record consent before outbound sales contact |

Every adapter should supply a stable `external_id` where the source provides one, so retries are idempotent. The normalized pipeline owns scoring, inventory matching, work-task creation, assignment, sourcing stage and notifications. GadgetPoint Admin remains the authority for inventory, orders and payments.
