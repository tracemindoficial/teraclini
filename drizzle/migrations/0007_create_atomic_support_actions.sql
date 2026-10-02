CREATE OR REPLACE FUNCTION public.create_support_ticket(_subject text, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _ticket_id uuid;
  _account_id uuid;
BEGIN
  _account_id := public.current_account_id();
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Active account required'; END IF;
  IF char_length(trim(_subject)) NOT BETWEEN 3 AND 160 THEN RAISE EXCEPTION 'Invalid subject'; END IF;
  IF char_length(trim(_message)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
  INSERT INTO public.support_tickets(account_id, user_id, subject)
  VALUES (_account_id, auth.uid(), trim(_subject)) RETURNING id INTO _ticket_id;
  INSERT INTO public.support_messages(ticket_id, account_id, author_user_id, author_type, message)
  VALUES (_ticket_id, _account_id, auth.uid(), 'professional', trim(_message));
  RETURN _ticket_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_support_ticket(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reply_support_ticket(_ticket_id uuid, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _message_id uuid;
  _account_id uuid;
BEGIN
  SELECT account_id INTO _account_id FROM public.support_tickets
  WHERE id = _ticket_id AND user_id = auth.uid() AND status <> 'resolved';
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Ticket unavailable'; END IF;
  IF char_length(trim(_message)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
  INSERT INTO public.support_messages(ticket_id, account_id, author_user_id, author_type, message)
  VALUES (_ticket_id, _account_id, auth.uid(), 'professional', trim(_message)) RETURNING id INTO _message_id;
  RETURN _message_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reply_support_ticket(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text) TO authenticated, service_role;