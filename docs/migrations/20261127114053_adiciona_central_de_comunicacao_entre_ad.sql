-- Adiciona Central de Comunicação entre administração e profissionais
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-11-27T14:40:53.562Z

CREATE TABLE IF NOT EXISTS public.communication_dispatches (
  id uuid PRIMARY KEY,
  sender_user_id uuid NOT NULL,
  fingerprint bytea NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0 CHECK (recipient_count >= 0)
);
CREATE TABLE IF NOT EXISTS public.communication_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.communication_dispatches(id),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  recipient_user_id uuid NOT NULL,
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 160),
  category text NOT NULL CHECK (category IN ('important','administrative','maintenance','technical','update','news','guidance','support')),
  priority boolean NOT NULL DEFAULT false,
  audience text NOT NULL CHECK (audience IN ('individual','all','trial')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_author text NOT NULL DEFAULT 'admin' CHECK (last_author IN ('admin','professional')),
  archived_at timestamptz,
  UNIQUE (batch_id, account_id, recipient_user_id)
);
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.communication_conversations(id),
  author_user_id uuid NOT NULL,
  author text NOT NULL CHECK (author IN ('admin','professional')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 8000),
  is_initial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (read_at IS NULL OR read_at >= created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS communication_one_initial ON public.communication_messages(conversation_id) WHERE is_initial;
CREATE INDEX IF NOT EXISTS communication_chronology ON public.communication_messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS communication_unread ON public.communication_messages(conversation_id, author) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS communication_by_recipient ON public.communication_conversations(recipient_user_id, last_message_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS communication_by_activity ON public.communication_conversations(last_message_at DESC, id DESC);
ALTER TABLE public.communication_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_dispatches, public.communication_conversations, public.communication_messages FROM PUBLIC, anon, authenticated;

ALTER TABLE public.professional_notifications ADD COLUMN IF NOT EXISTS recipient_user_id uuid;
CREATE INDEX IF NOT EXISTS communication_notification_unread ON public.professional_notifications(recipient_user_id, account_id) WHERE kind = 'admin_communication' AND read_at IS NULL;
DROP POLICY IF EXISTS "Communication notifications are private" ON public.professional_notifications;
CREATE POLICY "Communication notifications are private" ON public.professional_notifications AS RESTRICTIVE FOR SELECT TO PUBLIC
USING (kind IS DISTINCT FROM 'admin_communication' OR recipient_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.communication_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL
    AND coalesce(public.platform_admin_role_for(auth.uid())::text, '') = 'super_admin'
    AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.owner_user_id = auth.uid() AND a.status = 'active' AND a.blocked_at IS NULL AND a.deletion_started_at IS NULL);
$$;
CREATE OR REPLACE FUNCTION public.communication_is_recipient(_account uuid, _recipient uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND _recipient = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.accounts a ON a.id = p.account_id
      WHERE p.id = auth.uid() AND p.account_id = _account AND a.owner_user_id = auth.uid() AND a.deletion_started_at IS NULL)
    AND public.is_account_member(_account, auth.uid());
$$;
REVOKE ALL ON FUNCTION public.communication_is_admin(), public.communication_is_recipient(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.communication_is_admin(), public.communication_is_recipient(uuid,uuid) TO authenticated;
DROP POLICY IF EXISTS "Read authorized communication conversations" ON public.communication_conversations;
CREATE POLICY "Read authorized communication conversations" ON public.communication_conversations FOR SELECT TO authenticated
USING (public.communication_is_admin() OR public.communication_is_recipient(account_id, recipient_user_id));
DROP POLICY IF EXISTS "Read authorized communication messages" ON public.communication_messages;
CREATE POLICY "Read authorized communication messages" ON public.communication_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.communication_conversations c WHERE c.id = conversation_id));

CREATE OR REPLACE FUNCTION public.communication_targets() RETURNS TABLE(user_id uuid, account_id uuid, full_name text, on_trial boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, a.id, coalesce(nullif(btrim(p.full_name), ''), a.name), access.state = 'trial'
  FROM public.accounts a
  JOIN public.profiles p ON p.id = a.owner_user_id AND p.account_id = a.id
  JOIN public.account_members m ON m.account_id = a.id AND m.user_id = p.id AND m.status = 'active'
  CROSS JOIN LATERAL (SELECT public.account_commercial_state(a.id) AS state OFFSET 0) access
  WHERE a.status = 'active' AND a.blocked_at IS NULL AND a.deletion_started_at IS NULL
    AND p.onboarding_completed AND access.state IN ('active','payment_pending','legacy','admin_trial','trial')
    AND public.platform_admin_role_for(p.id) IS NULL;
$$;
REVOKE ALL ON FUNCTION public.communication_targets() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.communication_recipients(_search text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.communication_is_admin() THEN RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.full_name, r.id), '[]'::jsonb) FROM (
    SELECT t.user_id AS id, t.full_name FROM public.communication_targets() t
    WHERE strpos(lower(t.full_name), lower(left(btrim(coalesce(_search, '')), 160))) > 0 OR btrim(coalesce(_search, '')) = ''
    ORDER BY t.full_name, t.user_id LIMIT 30
  ) r);
END; $$;

CREATE OR REPLACE FUNCTION public.communication_send(_request uuid, _audience text, _recipient uuid, _subject text, _category text, _priority boolean, _body text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); fingerprint_value bytea; prior public.communication_dispatches%ROWTYPE; sent integer; sent_at timestamptz := clock_timestamp();
BEGIN
  IF NOT public.communication_is_admin() THEN RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501'; END IF;
  _subject := btrim(coalesce(_subject,'')); _body := btrim(coalesce(_body,''));
  IF _request IS NULL OR _audience IS NULL OR _audience NOT IN ('all','trial','individual') OR (_audience = 'individual') <> (_recipient IS NOT NULL)
    OR _category IS NULL OR _category NOT IN ('important','administrative','maintenance','technical','update','news','guidance','support')
    OR _priority IS NULL OR char_length(_subject) NOT BETWEEN 1 AND 160 OR char_length(_body) NOT BETWEEN 1 AND 8000
  THEN RAISE EXCEPTION 'Confira o destinatário, a categoria, o assunto e o texto.' USING ERRCODE = '22023'; END IF;
  fingerprint_value := sha256(convert_to(jsonb_build_array(_audience,_recipient,_subject,_category,_priority,_body)::text, 'UTF8'));
  INSERT INTO public.communication_dispatches(id, sender_user_id, fingerprint) VALUES (_request, actor, fingerprint_value) ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO prior FROM public.communication_dispatches WHERE id = _request;
    IF prior.sender_user_id <> actor OR prior.fingerprint <> fingerprint_value THEN RAISE EXCEPTION 'Esta solicitação já foi usada. Atualize a página e tente novamente.' USING ERRCODE = '22023'; END IF;
    RETURN prior.recipient_count;
  END IF;

  WITH created AS (
    INSERT INTO public.communication_conversations(batch_id, account_id, recipient_user_id, subject, category, priority, audience, created_at, last_message_at)
    SELECT _request, t.account_id, t.user_id, _subject, _category, _priority, _audience, sent_at, sent_at
    FROM public.communication_targets() t
    WHERE _audience = 'all' OR (_audience = 'trial' AND t.on_trial) OR (_audience = 'individual' AND t.user_id = _recipient)
    ORDER BY t.account_id
    RETURNING id, account_id, recipient_user_id
  ), messages AS (
    INSERT INTO public.communication_messages(conversation_id, author_user_id, author, body, is_initial, created_at)
    SELECT id, actor, 'admin', _body, true, sent_at FROM created
    RETURNING id, conversation_id
  )
  INSERT INTO public.professional_notifications(account_id, recipient_user_id, event_key, kind, title, body, action_path, created_at)
  SELECT c.account_id, c.recipient_user_id, 'communication:' || m.id, 'admin_communication', 'Mensagens da Administração',
    CASE WHEN _priority THEN 'Você recebeu uma mensagem prioritária.' ELSE 'Você recebeu uma mensagem.' END, '/mensagens', sent_at
  FROM created c JOIN messages m ON m.conversation_id = c.id;
  GET DIAGNOSTICS sent = ROW_COUNT;
  IF sent = 0 THEN RAISE EXCEPTION 'Nenhum profissional ativo encontrado para este envio.' USING ERRCODE = '22023'; END IF;
  UPDATE public.communication_dispatches SET recipient_count = sent WHERE id = _request;
  RETURN sent;
END; $$;

CREATE OR REPLACE FUNCTION public.communication_list(_admin boolean, _filter text DEFAULT 'all', _search text DEFAULT '', _offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE term text := lower(left(btrim(coalesce(_search,'')),160));
BEGIN
  IF auth.uid() IS NULL OR _admin IS NULL OR (_admin AND NOT public.communication_is_admin()) THEN RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501'; END IF;
  IF _filter IS NULL OR _filter NOT IN ('all','waiting','unread','priority','archived') THEN RAISE EXCEPTION 'Filtro inválido.' USING ERRCODE = '22023'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.last_message_at DESC, r.id DESC), '[]'::jsonb) FROM (
    SELECT c.id, CASE WHEN _admin THEN c.recipient_user_id ELSE NULL END AS recipient_id,
      CASE WHEN _admin THEN coalesce(nullif(btrim(p.full_name),''), nullif(btrim(a.name),''), 'Profissional') ELSE '' END AS professional_name,
      c.subject, c.category, c.priority, c.created_at, c.last_message_at, c.audience, c.batch_id,
      (SELECT left(m.body, 240) FROM public.communication_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_body,
      (SELECT m.read_at FROM public.communication_messages m WHERE m.conversation_id = c.id AND m.is_initial) AS initial_read_at,
      CASE WHEN c.archived_at IS NOT NULL THEN 'archived' WHEN c.last_author = 'admin' THEN 'waiting_professional' ELSE 'waiting_admin' END AS status,
      counts.unread
    FROM public.communication_conversations c
    JOIN public.accounts a ON a.id = c.account_id
    LEFT JOIN public.profiles p ON p.id = c.recipient_user_id AND p.account_id = c.account_id
    CROSS JOIN LATERAL (SELECT count(*)::integer AS unread FROM public.communication_messages m
      WHERE m.conversation_id = c.id AND m.author = CASE WHEN _admin THEN 'professional' ELSE 'admin' END AND m.read_at IS NULL) counts
    WHERE (_admin OR (c.recipient_user_id = auth.uid() AND public.communication_is_recipient(c.account_id, c.recipient_user_id)))
      AND (NOT _admin OR (_filter = 'archived') = (c.archived_at IS NOT NULL))
      AND (_filter <> 'waiting' OR c.last_author = 'professional')
      AND (_filter <> 'priority' OR c.priority)
      AND (_filter <> 'unread' OR counts.unread > 0)
      AND (term = '' OR strpos(lower(c.subject), term) > 0 OR (_admin AND strpos(lower(coalesce(nullif(btrim(p.full_name),''), a.name)), term) > 0))
    ORDER BY c.last_message_at DESC, c.id DESC OFFSET greatest(0, coalesce(_offset,0)) LIMIT 26
  ) r);
END; $$;

CREATE OR REPLACE FUNCTION public.communication_unread(_admin boolean) RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR _admin IS NULL OR (_admin AND NOT public.communication_is_admin()) THEN RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501'; END IF;
  IF _admin THEN
    RETURN (SELECT count(*)::integer FROM public.communication_messages m JOIN public.communication_conversations c ON c.id = m.conversation_id
      WHERE m.author = 'professional' AND m.read_at IS NULL AND c.archived_at IS NULL);
  END IF;
  RETURN (SELECT count(*)::integer FROM public.professional_notifications n
    WHERE n.recipient_user_id = auth.uid() AND n.kind = 'admin_communication' AND n.read_at IS NULL
      AND public.communication_is_recipient(n.account_id, n.recipient_user_id));
END; $$;

CREATE OR REPLACE FUNCTION public.communication_lock(_id uuid, _admin boolean) RETURNS public.communication_conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.communication_conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR _admin IS NULL OR (_admin AND NOT public.communication_is_admin()) THEN RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.communication_conversations t WHERE t.id = _id
    AND (_admin OR (t.recipient_user_id = auth.uid() AND public.communication_is_recipient(t.account_id, t.recipient_user_id))) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada ou indisponível.' USING ERRCODE = '42501'; END IF;
  RETURN c;
END; $$;
REVOKE ALL ON FUNCTION public.communication_lock(uuid,boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.communication_open(_id uuid, _admin boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.communication_conversations%ROWTYPE; opened timestamptz;
BEGIN
  c := public.communication_lock(_id, _admin);
  opened := clock_timestamp();
  WITH seen AS (
    UPDATE public.communication_messages m SET read_at = greatest(opened, m.created_at)
    WHERE m.conversation_id = c.id AND m.author = CASE WHEN _admin THEN 'professional' ELSE 'admin' END AND m.read_at IS NULL
    RETURNING m.id, m.read_at
  )
  UPDATE public.professional_notifications n SET read_at = s.read_at FROM seen s
  WHERE NOT _admin AND n.event_key = 'communication:' || s.id AND n.kind = 'admin_communication'
    AND n.account_id = c.account_id AND n.recipient_user_id = auth.uid() AND n.read_at IS NULL;
  RETURN jsonb_build_object('archived', c.archived_at IS NOT NULL, 'messages', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id,'author',m.author,'body',m.body,'created_at',m.created_at,'read_at',m.read_at)
      ORDER BY m.created_at,m.id),'[]'::jsonb) FROM public.communication_messages m WHERE m.conversation_id = c.id));
END; $$;

CREATE OR REPLACE FUNCTION public.communication_reply(_id uuid, _admin boolean, _request uuid, _body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.communication_conversations%ROWTYPE; prior public.communication_messages%ROWTYPE; side text; sent_at timestamptz;
BEGIN
  c := public.communication_lock(_id, _admin);
  side := CASE WHEN _admin THEN 'admin' ELSE 'professional' END;
  _body := btrim(coalesce(_body,''));
  IF _request IS NULL OR char_length(_body) NOT BETWEEN 1 AND 8000 THEN RAISE EXCEPTION 'Preencha a resposta.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO prior FROM public.communication_messages WHERE id = _request;
  IF FOUND THEN
    IF prior.conversation_id <> c.id OR prior.author <> side OR prior.author_user_id <> auth.uid() OR prior.body <> _body OR prior.is_initial THEN
      RAISE EXCEPTION 'Esta solicitação já foi usada.' USING ERRCODE = '22023';
    END IF;
    RETURN _request;
  END IF;
  IF c.archived_at IS NOT NULL THEN RAISE EXCEPTION 'A conversa está arquivada. Restaure-a antes de responder.' USING ERRCODE = '22023'; END IF;
  IF _admin AND NOT EXISTS (SELECT 1 FROM public.communication_targets() t WHERE t.account_id = c.account_id AND t.user_id = c.recipient_user_id)
    THEN RAISE EXCEPTION 'O profissional não está disponível para receber mensagens.' USING ERRCODE = '22023'; END IF;
  sent_at := greatest(clock_timestamp(), c.last_message_at + interval '1 microsecond');
  INSERT INTO public.communication_messages(id, conversation_id, author_user_id, author, body, created_at)
    VALUES (_request, c.id, auth.uid(), side, _body, sent_at);
  UPDATE public.communication_conversations SET last_message_at = sent_at, last_author = side WHERE id = c.id;
  IF _admin THEN
    INSERT INTO public.professional_notifications(account_id, recipient_user_id, event_key, kind, title, body, action_path, created_at)
    VALUES (c.account_id, c.recipient_user_id, 'communication:' || _request, 'admin_communication', 'Mensagens da Administração',
      CASE WHEN c.priority THEN 'Você recebeu uma resposta em uma conversa prioritária.' ELSE 'Você recebeu uma resposta.' END, '/mensagens', sent_at);
  END IF;
  RETURN _request;
END; $$;

CREATE OR REPLACE FUNCTION public.communication_archive(_id uuid, _archived boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.communication_conversations%ROWTYPE;
BEGIN
  c := public.communication_lock(_id, true);
  IF _archived IS NULL THEN RAISE EXCEPTION 'Estado inválido.' USING ERRCODE = '22023'; END IF;
  UPDATE public.communication_conversations SET archived_at = CASE WHEN _archived THEN coalesce(c.archived_at,clock_timestamp()) ELSE NULL END WHERE id = c.id;
  RETURN _archived;
END; $$;

REVOKE ALL ON FUNCTION public.communication_recipients(text), public.communication_send(uuid,text,uuid,text,text,boolean,text), public.communication_list(boolean,text,text,integer), public.communication_unread(boolean), public.communication_open(uuid,boolean), public.communication_reply(uuid,boolean,uuid,text), public.communication_archive(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.communication_recipients(text), public.communication_send(uuid,text,uuid,text,text,boolean,text), public.communication_list(boolean,text,text,integer), public.communication_unread(boolean), public.communication_open(uuid,boolean), public.communication_reply(uuid,boolean,uuid,text), public.communication_archive(uuid,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';

ALTER TABLE public.communication_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dispatch records are managed by the send function" ON public.communication_dispatches;
CREATE POLICY "Dispatch records are managed by the send function" ON public.communication_dispatches AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.my_commercial_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE acc uuid;
BEGIN
  SELECT am.account_id INTO acc FROM public.account_members am WHERE am.user_id = auth.uid() AND am.status = 'active' ORDER BY am.created_at LIMIT 1;
  IF acc IS NULL THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  RETURN public.account_commercial_summary(acc) || jsonb_build_object(
    'contract_requested_at', (SELECT max(created_at) FROM public.access_grant_events WHERE account_id = acc AND action = 'contract.requested'),
    'notifications', coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC) FROM (SELECT id, kind, title, body, action_path, read_at, created_at FROM public.professional_notifications WHERE account_id = acc AND kind IS DISTINCT FROM 'admin_communication' AND suppressed_at IS NULL ORDER BY created_at DESC LIMIT 10) n), '[]'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_my_notification_read(_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.professional_notifications n SET read_at = coalesce(read_at, now())
  WHERE n.id = _id AND n.kind IS DISTINCT FROM 'admin_communication' AND EXISTS (SELECT 1 FROM public.account_members am WHERE am.account_id = n.account_id AND am.user_id = auth.uid() AND am.status = 'active');
$function$;

CREATE OR REPLACE FUNCTION public.admin_subscription_detail(_actor_user_id uuid, _account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id, true);
  SELECT jsonb_build_object(
    'account_id', a.id, 'created_at', a.created_at, 'account_status', a.status, 'full_name', p.full_name, 'email', u.email,
    'summary', public.account_commercial_summary(a.id),
    'events', coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC) FROM (SELECT action, previous_values, new_values, reason, created_at, actor_user_id FROM public.access_grant_events WHERE account_id = a.id ORDER BY created_at DESC LIMIT 50) e), '[]'::jsonb),
    'notifications', coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC) FROM (SELECT kind, title, in_app_status, external_status, attempts, last_error, read_at, suppressed_at, created_at FROM public.professional_notifications WHERE account_id = a.id AND kind IS DISTINCT FROM 'admin_communication' ORDER BY created_at DESC LIMIT 50) n), '[]'::jsonb),
    'payments', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.cycle_number DESC NULLS LAST) FROM (SELECT cycle_number, amount_cents, due_on, paid_at, status, method FROM public.payments WHERE account_id = a.id ORDER BY cycle_number DESC NULLS LAST LIMIT 50) x), '[]'::jsonb)
  ) INTO result
  FROM public.accounts a LEFT JOIN public.profiles p ON p.id = a.owner_user_id LEFT JOIN auth.users u ON u.id = a.owner_user_id
  WHERE a.id = _account_id;
  IF result IS NULL THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  RETURN result;
END;
$function$;
