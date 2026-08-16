-- Production security-advisor hardening.
-- Safe to re-run after supabase/schema.sql.

-- This function is a trigger implementation and must not be exposed as a Data API RPC.
-- PostgreSQL invokes it through its trigger; direct client EXECUTE is unnecessary.
revoke execute on function public.sync_genuine_buyer_request_goal() from public, anon, authenticated;
grant execute on function public.sync_genuine_buyer_request_goal() to service_role;
