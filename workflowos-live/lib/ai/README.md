# AI safety architecture

Use server-side AI calls only.

Recommended tools:
- suggest_products
- draft_campaign
- generate_marketing_content
- create_task (approval-aware)
- summarize_leads
- analyze_campaign
- recommend_growth_action

Do not allow the model to directly execute sensitive operations without an authorization check.
Log AI-generated actions in `activity_logs`.
Never expose an OpenAI secret key to browser code.
