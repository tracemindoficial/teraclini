ALTER TYPE public.support_ticket_status ADD VALUE IF NOT EXISTS 'closed';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_reset_required_at TIMESTAMPTZ;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_admin_user_id UUID,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')) NOT VALID;

CREATE TABLE public.admin_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  notification_key TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, notification_key),
  CHECK (char_length(notification_key) BETWEEN 3 AND 220)
);
GRANT ALL ON public.admin_notification_reads TO service_role;
ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (event_type IN ('password_reset_sent', 'access_instructions_sent', 'password_reset_required', 'password_changed', 'sessions_revoked', 'email_changed'))
);
GRANT ALL ON public.account_access_events TO service_role;
ALTER TABLE public.account_access_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX admin_notification_reads_admin_idx ON public.admin_notification_reads(admin_user_id, read_at DESC);
CREATE INDEX account_access_events_account_created_idx ON public.account_access_events(account_id, created_at DESC);
CREATE INDEX support_tickets_priority_status_idx ON public.support_tickets(priority, status, last_message_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_operational_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Operational history is append-only';
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_operational_history_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_operational_history_mutation() TO service_role;

CREATE TRIGGER subscription_events_append_only BEFORE UPDATE OR DELETE ON public.subscription_events FOR EACH ROW EXECUTE FUNCTION public.prevent_operational_history_mutation();
CREATE TRIGGER payment_events_append_only BEFORE UPDATE OR DELETE ON public.payment_events FOR EACH ROW EXECUTE FUNCTION public.prevent_operational_history_mutation();
CREATE TRIGGER account_access_events_append_only BEFORE UPDATE OR DELETE ON public.account_access_events FOR EACH ROW EXECUTE FUNCTION public.prevent_operational_history_mutation();

COMMENT ON COLUMN public.profiles.force_password_reset IS 'Forces an authenticated user through the secure password recovery flow before professional access.';
COMMENT ON TABLE public.admin_notification_reads IS 'Per-administrator read state for operational alerts derived from authoritative data.';
COMMENT ON TABLE public.account_access_events IS 'Append-only security and access history without passwords, tokens, IP addresses, or clinical content.';