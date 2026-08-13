-- WorkflowOS core performance indexes.
-- Run after supabase/security-hardening.sql.
-- This deliberately covers current production paths only rather than indexing every dormant module.

create index if not exists idx_profiles_organization_id on public.profiles (organization_id);
create index if not exists idx_notifications_organization_id on public.notifications (organization_id);
create index if not exists idx_activity_logs_organization_id on public.activity_logs (organization_id);
create index if not exists idx_activity_logs_actor_id on public.activity_logs (actor_id);

create index if not exists idx_buyer_intents_assigned_to on public.buyer_intents (assigned_to);
create index if not exists idx_buyer_intents_lead_id on public.buyer_intents (lead_id);

create index if not exists idx_commerce_signals_integration_id on public.commerce_signals (integration_id);
create index if not exists idx_connected_sites_integration_id on public.connected_sites (integration_id);
create index if not exists idx_connected_staff_profile_id on public.connected_staff (profile_id);
create index if not exists idx_integration_credentials_integration_id on public.integration_credentials (integration_id);
create index if not exists idx_integration_credentials_created_by on public.integration_credentials (created_by);

create index if not exists idx_task_checklists_task_id on public.task_checklists (task_id);
create index if not exists idx_task_comments_task_id on public.task_comments (task_id);
create index if not exists idx_task_comments_author_id on public.task_comments (author_id);
create index if not exists idx_tasks_creator_id on public.tasks (creator_id);

create index if not exists idx_leads_assigned_to on public.leads (assigned_to);
create index if not exists idx_lead_followups_lead_id on public.lead_followups (lead_id);
create index if not exists idx_lead_followups_assigned_to on public.lead_followups (assigned_to);
create index if not exists idx_customer_conversations_integration_id on public.customer_conversations (integration_id);
create index if not exists idx_customer_conversations_lead_id on public.customer_conversations (lead_id);

create index if not exists idx_automation_rules_created_by on public.automation_rules (created_by);

-- Hot approval / integration / messaging / AI paths added to production on 2026-08-13.
create index if not exists idx_approvals_requested_by on public.approvals (requested_by);
create index if not exists idx_approvals_approver_id on public.approvals (approver_id);
create index if not exists idx_integration_commands_requested_by on public.integration_commands (requested_by);
create index if not exists idx_integration_commands_approved_by on public.integration_commands (approved_by);
create index if not exists idx_conversation_messages_org on public.conversation_messages (organization_id);
create index if not exists idx_conversation_messages_sender on public.conversation_messages (sender_profile_id);
create index if not exists idx_ai_proposals_created_by on public.ai_proposals (created_by);
create index if not exists idx_ai_proposals_approved_by on public.ai_proposals (approved_by);
