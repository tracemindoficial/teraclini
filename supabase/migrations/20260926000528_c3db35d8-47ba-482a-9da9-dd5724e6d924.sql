REVOKE ALL ON FUNCTION public.record_appointment_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_onboarding_task() FROM PUBLIC, anon, authenticated;
ALTER EXTENSION btree_gist SET SCHEMA extensions;