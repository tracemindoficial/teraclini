CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_user', 'resolved');
CREATE TYPE public.support_message_author AS ENUM ('professional', 'admin');

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 160),
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT UPDATE (subject, updated_at) ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals read own support tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_account_member(account_id));
CREATE POLICY "Professionals create own support tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND account_id = public.current_account_id());
CREATE POLICY "Professionals update own open support tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_account_member(account_id) AND status <> 'resolved') WITH CHECK (user_id = auth.uid() AND public.is_account_member(account_id));
CREATE INDEX support_tickets_user_created_idx ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX support_tickets_status_activity_idx ON public.support_tickets(status, last_message_at DESC);

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  author_type public.support_message_author NOT NULL DEFAULT 'professional',
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals read own support messages" ON public.support_messages FOR SELECT TO authenticated USING (author_type = 'professional' OR EXISTS (SELECT 1 FROM public.support_tickets ticket WHERE ticket.id = ticket_id AND ticket.user_id = auth.uid() AND public.is_account_member(ticket.account_id)));
CREATE POLICY "Professionals create messages on own tickets" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (author_user_id = auth.uid() AND author_type = 'professional' AND account_id = public.current_account_id() AND EXISTS (SELECT 1 FROM public.support_tickets ticket WHERE ticket.id = ticket_id AND ticket.user_id = auth.uid() AND ticket.account_id = account_id AND ticket.status <> 'resolved'));
CREATE INDEX support_messages_ticket_created_idx ON public.support_messages(ticket_id, created_at);

CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_support_ticket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_support_ticket() TO service_role;
CREATE TRIGGER support_message_touch_ticket AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_platform_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Platform audit events are append-only';
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_platform_audit_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_platform_audit_mutation() TO service_role;
CREATE TRIGGER platform_audit_events_append_only BEFORE UPDATE OR DELETE ON public.platform_audit_events FOR EACH ROW EXECUTE FUNCTION public.prevent_platform_audit_mutation();

COMMENT ON TABLE public.support_tickets IS 'Non-clinical support requests owned by one professional account.';
COMMENT ON TABLE public.support_messages IS 'Support conversation; users are instructed not to include patient or clinical content.';