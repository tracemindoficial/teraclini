CREATE TABLE public.access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('standard_trial','admin_trial','legacy')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  reason text,
  notes text,
  convertible boolean NOT NULL DEFAULT true,
  billing_starts_on date,
  expired_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'legacy' OR ends_at IS NOT NULL),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE UNIQUE INDEX access_grants_one_standard_trial ON public.access_grants(account_id) WHERE kind = 'standard_trial';
CREATE INDEX access_grants_account_idx ON public.access_grants(account_id, kind);
GRANT ALL ON public.access_grants TO service_role;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.access_grant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  grant_id uuid REFERENCES public.access_grants(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  action text NOT NULL,
  previous_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_grant_events_account_idx ON public.access_grant_events(account_id, created_at DESC);
GRANT ALL ON public.access_grant_events TO service_role;
ALTER TABLE public.access_grant_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.professional_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_path text,
  in_app_status text NOT NULL DEFAULT 'delivered',
  external_status text NOT NULL DEFAULT 'not_configured',
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  read_at timestamptz,
  suppressed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX professional_notifications_account_idx ON public.professional_notifications(account_id, created_at DESC);
GRANT SELECT ON public.professional_notifications TO authenticated;
GRANT ALL ON public.professional_notifications TO service_role;
ALTER TABLE public.professional_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own account notifications" ON public.professional_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.account_members am WHERE am.account_id = professional_notifications.account_id AND am.user_id = auth.uid() AND am.status = 'active'));

CREATE TABLE public.subscription_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger_source text NOT NULL DEFAULT 'schedule',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  failures integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.subscription_job_runs TO service_role;
ALTER TABLE public.subscription_job_runs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_access_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Histórico comercial é imutável.'; END; $$;
CREATE TRIGGER access_grant_events_immutable BEFORE UPDATE OR DELETE ON public.access_grant_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_access_event_mutation();

ALTER TABLE public.account_subscriptions
  ADD COLUMN promo_price_cents integer NOT NULL DEFAULT 4700 CHECK (promo_price_cents > 0),
  ADD COLUMN promo_cycles integer NOT NULL DEFAULT 3 CHECK (promo_cycles BETWEEN 0 AND 24),
  ADD COLUMN regular_price_cents integer NOT NULL DEFAULT 5990 CHECK (regular_price_cents > 0),
  ADD COLUMN configured_by uuid,
  ADD COLUMN configured_at timestamptz;
ALTER TABLE public.payments ADD COLUMN cycle_number integer CHECK (cycle_number IS NULL OR cycle_number > 0);
CREATE UNIQUE INDEX payments_one_per_cycle ON public.payments(subscription_id, cycle_number) WHERE cycle_number IS NOT NULL AND status NOT IN ('rejected','cancelled','refunded');

-- Backfill: existing accounts keep their current access.
INSERT INTO public.access_grants(account_id, kind, starts_at, reason)
SELECT a.id, 'legacy', a.created_at, 'Conta existente antes da política comercial' FROM public.accounts a;
INSERT INTO public.access_grant_events(account_id, grant_id, action, new_values, reason)
SELECT g.account_id, g.id, 'grant.legacy', jsonb_build_object('kind','legacy'), g.reason FROM public.access_grants g;

CREATE OR REPLACE FUNCTION public.subscription_cycle_price(_cycle integer, _promo integer, _promo_cycles integer, _regular integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _cycle <= _promo_cycles THEN _promo ELSE _regular END
$$;

CREATE OR REPLACE FUNCTION public.account_commercial_state(_account_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  acc public.accounts%ROWTYPE;
  sub public.account_subscriptions%ROWTYPE;
  onboarded boolean;
BEGIN
  SELECT * INTO acc FROM public.accounts WHERE id = _account_id;
  IF NOT FOUND THEN RETURN 'cancelled'; END IF;
  IF acc.status <> 'active' OR acc.blocked_at IS NOT NULL THEN RETURN 'suspended'; END IF;
  SELECT * INTO sub FROM public.account_subscriptions WHERE account_id = _account_id;
  IF sub.id IS NOT NULL AND sub.status IN ('active','cancellation_requested') THEN RETURN 'active'; END IF;
  IF sub.id IS NOT NULL AND sub.status IN ('payment_pending','grace_period') THEN RETURN 'payment_pending'; END IF;
  IF EXISTS (SELECT 1 FROM public.access_grants g WHERE g.account_id = _account_id AND g.kind = 'legacy' AND g.revoked_at IS NULL) THEN RETURN 'legacy'; END IF;
  IF EXISTS (SELECT 1 FROM public.access_grants g WHERE g.account_id = _account_id AND g.kind = 'admin_trial' AND g.revoked_at IS NULL AND g.starts_at <= now() AND g.ends_at > now()) THEN RETURN 'admin_trial'; END IF;
  IF sub.id IS NOT NULL AND sub.status = 'restricted' THEN RETURN 'overdue'; END IF;
  IF sub.id IS NOT NULL AND sub.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  IF EXISTS (SELECT 1 FROM public.access_grants g WHERE g.account_id = _account_id AND g.kind = 'standard_trial' AND g.revoked_at IS NULL AND g.starts_at <= now() AND g.ends_at > now()) THEN RETURN 'trial'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.access_grants g WHERE g.account_id = _account_id) THEN
    SELECT bool_or(p.onboarding_completed) INTO onboarded FROM public.profiles p WHERE p.account_id = _account_id;
    IF NOT coalesce(onboarded, false) THEN RETURN 'pre_trial'; END IF;
  END IF;
  RETURN 'awaiting_contract';
END; $$;

CREATE OR REPLACE FUNCTION public.has_commercial_access(_account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.account_commercial_state(_account_id) IN ('active','payment_pending','legacy','admin_trial','trial','pre_trial')
$$;

CREATE OR REPLACE FUNCTION public.is_account_member(_account_id uuid, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am
    JOIN public.accounts a ON a.id = am.account_id
    WHERE am.account_id = _account_id
      AND am.user_id = _user_id
      AND am.status = 'active'
      AND a.status = 'active'
      AND a.blocked_at IS NULL
  ) AND public.has_commercial_access(_account_id)
$function$;

CREATE OR REPLACE FUNCTION public.start_standard_trial_on_onboarding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_grant uuid;
BEGIN
  IF NEW.onboarding_completed AND NOT coalesce(OLD.onboarding_completed, false) AND NEW.account_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.access_grants WHERE account_id = NEW.account_id) THEN
    INSERT INTO public.access_grants(account_id, kind, starts_at, ends_at, reason)
    VALUES (NEW.account_id, 'standard_trial', now(), now() + interval '7 days', 'Teste gratuito padrão')
    ON CONFLICT DO NOTHING RETURNING id INTO new_grant;
    IF new_grant IS NOT NULL THEN
      INSERT INTO public.access_grant_events(account_id, grant_id, actor_user_id, action, new_values)
      VALUES (NEW.account_id, new_grant, NEW.id, 'trial.started', jsonb_build_object('days', 7));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_start_standard_trial AFTER UPDATE OF onboarding_completed ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.start_standard_trial_on_onboarding();

CREATE OR REPLACE FUNCTION public.assert_billing_admin(_actor_user_id uuid, _read_only boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.platform_admin_role; st text;
BEGIN
  SELECT pa.role, a.status INTO r, st FROM public.platform_admins pa JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;
  IF r IS NULL OR st <> 'active' THEN RAISE EXCEPTION 'Operação não autorizada.'; END IF;
  IF _read_only AND r IN ('super_admin','finance_admin','support_admin') THEN RETURN; END IF;
  IF r NOT IN ('super_admin','finance_admin') THEN RAISE EXCEPTION 'Operação não autorizada.'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.suppress_resolved_trial_notifications(_account_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.professional_notifications SET suppressed_at = now()
  WHERE account_id = _account_id AND kind IN ('trial_day5','trial_ended') AND suppressed_at IS NULL
    AND public.account_commercial_state(_account_id) IN ('active','payment_pending','legacy','admin_trial');
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_trial(_actor_user_id uuid, _account_id uuid, _days integer, _starts_at timestamptz, _reason text, _notes text, _convertible boolean, _billing_starts_on date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev public.access_grants%ROWTYPE; new_id uuid; s timestamptz := coalesce(_starts_at, now());
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id);
  IF _days IS NULL OR _days < 1 OR _days > 365 THEN RAISE EXCEPTION 'Duração deve ficar entre 1 e 365 dias.'; END IF;
  IF _reason NOT IN ('degustacao','demonstracao','parceria','cortesia') THEN RAISE EXCEPTION 'Motivo inválido.'; END IF;
  PERFORM 1 FROM public.accounts WHERE id = _account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  FOR prev IN SELECT * FROM public.access_grants WHERE account_id = _account_id AND kind = 'admin_trial' AND revoked_at IS NULL LOOP
    UPDATE public.access_grants SET revoked_at = now(), updated_at = now() WHERE id = prev.id;
    INSERT INTO public.access_grant_events(account_id, grant_id, actor_user_id, action, previous_values, reason)
    VALUES (_account_id, prev.id, _actor_user_id, 'grant.replaced', jsonb_build_object('ends_at', prev.ends_at), 'Substituída por nova degustação');
  END LOOP;
  INSERT INTO public.access_grants(account_id, kind, starts_at, ends_at, reason, notes, convertible, billing_starts_on, created_by)
  VALUES (_account_id, 'admin_trial', s, s + make_interval(days => _days), _reason, nullif(trim(_notes), ''), coalesce(_convertible, true), _billing_starts_on, _actor_user_id)
  RETURNING id INTO new_id;
  INSERT INTO public.access_grant_events(account_id, grant_id, actor_user_id, action, new_values, reason)
  VALUES (_account_id, new_id, _actor_user_id, 'grant.admin_trial', jsonb_build_object('days', _days, 'starts_at', s, 'ends_at', s + make_interval(days => _days), 'convertible', _convertible, 'billing_starts_on', _billing_starts_on), _reason);
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'access.grant_trial', 'access_grant', new_id, _account_id, ARRAY['ends_at','reason'], 'success');
  PERFORM public.suppress_resolved_trial_notifications(_account_id);
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_extend_access(_actor_user_id uuid, _account_id uuid, _days integer, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.access_grants%ROWTYPE; new_end timestamptz;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id);
  IF _days IS NULL OR _days < 1 OR _days > 365 THEN RAISE EXCEPTION 'Prorrogação deve ficar entre 1 e 365 dias.'; END IF;
  IF coalesce(trim(_reason), '') = '' THEN RAISE EXCEPTION 'Informe o motivo da prorrogação.'; END IF;
  SELECT * INTO g FROM public.access_grants WHERE account_id = _account_id AND kind IN ('admin_trial','standard_trial') AND revoked_at IS NULL
  ORDER BY ends_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum período gratuito para prorrogar.'; END IF;
  new_end := greatest(g.ends_at, now()) + make_interval(days => _days);
  UPDATE public.access_grants SET ends_at = new_end, expired_at = NULL, updated_at = now() WHERE id = g.id;
  INSERT INTO public.access_grant_events(account_id, grant_id, actor_user_id, action, previous_values, new_values, reason)
  VALUES (_account_id, g.id, _actor_user_id, 'grant.extended', jsonb_build_object('ends_at', g.ends_at), jsonb_build_object('ends_at', new_end, 'days', _days), _reason);
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'access.extend', 'access_grant', g.id, _account_id, ARRAY['ends_at'], 'success');
  PERFORM public.suppress_resolved_trial_notifications(_account_id);
  RETURN g.id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_access_grant(_actor_user_id uuid, _account_id uuid, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.access_grants%ROWTYPE; n integer := 0;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id);
  IF coalesce(trim(_reason), '') = '' THEN RAISE EXCEPTION 'Informe o motivo.'; END IF;
  FOR g IN SELECT * FROM public.access_grants WHERE account_id = _account_id AND kind IN ('admin_trial','legacy') AND revoked_at IS NULL FOR UPDATE LOOP
    UPDATE public.access_grants SET revoked_at = now(), updated_at = now() WHERE id = g.id;
    INSERT INTO public.access_grant_events(account_id, grant_id, actor_user_id, action, previous_values, reason)
    VALUES (_account_id, g.id, _actor_user_id, 'grant.revoked', jsonb_build_object('kind', g.kind, 'ends_at', g.ends_at), _reason);
    n := n + 1;
  END LOOP;
  IF n = 0 THEN RAISE EXCEPTION 'Nenhuma liberação gratuita vigente.'; END IF;
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'access.revoke', 'account', _account_id, _account_id, ARRAY['revoked_at'], 'success');
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_configure_billing(_actor_user_id uuid, _account_id uuid, _first_due_on date, _promo_price_cents integer, _promo_cycles integer, _regular_price_cents integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE plan_id uuid; prev public.account_subscriptions%ROWTYPE; sub_id uuid;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id);
  IF _first_due_on IS NULL OR _first_due_on < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'A primeira cobrança não pode ser no passado.'; END IF;
  IF _promo_price_cents < 100 OR _regular_price_cents < 100 OR _promo_cycles < 0 OR _promo_cycles > 24 THEN RAISE EXCEPTION 'Valores de cobrança inválidos.'; END IF;
  IF EXISTS (SELECT 1 FROM public.access_grants WHERE account_id = _account_id AND kind = 'admin_trial' AND revoked_at IS NULL AND ends_at > now() AND NOT convertible) THEN
    RAISE EXCEPTION 'A degustação vigente foi marcada como não conversível.';
  END IF;
  SELECT id INTO plan_id FROM public.subscription_plans WHERE code = 'teraclini_mensal';
  IF plan_id IS NULL THEN
    INSERT INTO public.subscription_plans(name, code, price_cents, billing_interval_months, first_payment_days, is_active)
    VALUES ('TeraClini — Plano único', 'teraclini_mensal', 5990, 1, 7, true) RETURNING id INTO plan_id;
  END IF;
  SELECT * INTO prev FROM public.account_subscriptions WHERE account_id = _account_id FOR UPDATE;
  IF prev.id IS NULL THEN
    INSERT INTO public.account_subscriptions(account_id, plan_id, contracted_price_cents, starts_on, next_due_on, billing_period, status, promo_price_cents, promo_cycles, regular_price_cents, configured_by, configured_at)
    VALUES (_account_id, plan_id, public.subscription_cycle_price(1, _promo_price_cents, _promo_cycles, _regular_price_cents), _first_due_on, _first_due_on, date_trunc('month', _first_due_on)::date, 'awaiting_first_payment', _promo_price_cents, _promo_cycles, _regular_price_cents, _actor_user_id, now())
    RETURNING id INTO sub_id;
  ELSE
    UPDATE public.account_subscriptions SET plan_id = plan_id, next_due_on = _first_due_on, billing_period = date_trunc('month', _first_due_on)::date,
      promo_price_cents = _promo_price_cents, promo_cycles = _promo_cycles, regular_price_cents = _regular_price_cents,
      contracted_price_cents = public.subscription_cycle_price((SELECT count(*)::int + 1 FROM public.payments p WHERE p.subscription_id = prev.id AND p.status = 'confirmed'), _promo_price_cents, _promo_cycles, _regular_price_cents),
      status = CASE WHEN prev.status = 'cancelled' THEN 'awaiting_first_payment'::public.subscription_status ELSE prev.status END,
      cancelled_at = CASE WHEN prev.status = 'cancelled' THEN NULL ELSE prev.cancelled_at END,
      cancellation_requested_at = CASE WHEN prev.status = 'cancelled' THEN NULL ELSE prev.cancellation_requested_at END,
      configured_by = _actor_user_id, configured_at = now(), updated_at = now()
    WHERE id = prev.id RETURNING id INTO sub_id;
  END IF;
  INSERT INTO public.access_grant_events(account_id, actor_user_id, action, previous_values, new_values)
  VALUES (_account_id, _actor_user_id, 'billing.configured',
    CASE WHEN prev.id IS NULL THEN NULL ELSE jsonb_build_object('next_due_on', prev.next_due_on, 'promo_price_cents', prev.promo_price_cents, 'promo_cycles', prev.promo_cycles, 'regular_price_cents', prev.regular_price_cents) END,
    jsonb_build_object('next_due_on', _first_due_on, 'promo_price_cents', _promo_price_cents, 'promo_cycles', _promo_cycles, 'regular_price_cents', _regular_price_cents));
  INSERT INTO public.subscription_events(subscription_id, account_id, actor_user_id, event_type, previous_status, new_status, changed_fields, note)
  SELECT sub_id, _account_id, _actor_user_id, 'billing.configured', prev.status, s.status, ARRAY['next_due_on','promo_price_cents','promo_cycles','regular_price_cents'], NULL FROM public.account_subscriptions s WHERE s.id = sub_id;
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'billing.configure', 'subscription', sub_id, _account_id, ARRAY['next_due_on','price'], 'success');
  RETURN sub_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_record_subscription_payment(_actor_user_id uuid, _account_id uuid, _paid_at timestamptz, _method text, _transaction_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub public.account_subscriptions%ROWTYPE; cyc integer; amount integer; pay_id uuid;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id);
  IF _method NOT IN ('pix','other') THEN RAISE EXCEPTION 'Forma de pagamento inválida.'; END IF;
  IF _paid_at IS NULL OR _paid_at > now() + interval '1 hour' THEN RAISE EXCEPTION 'Data de pagamento inválida.'; END IF;
  SELECT * INTO sub FROM public.account_subscriptions WHERE account_id = _account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configure a cobrança antes de registrar pagamentos.'; END IF;
  IF sub.status = 'cancelled' THEN RAISE EXCEPTION 'Assinatura cancelada.'; END IF;
  SELECT coalesce(max(cycle_number), 0) + 1 INTO cyc FROM public.payments WHERE subscription_id = sub.id AND status = 'confirmed';
  amount := public.subscription_cycle_price(cyc, sub.promo_price_cents, sub.promo_cycles, sub.regular_price_cents);
  INSERT INTO public.payments(account_id, subscription_id, amount_cents, due_on, billing_period, paid_at, method, status, transaction_id, confirmation_source, confirmed_at, confirmed_by, cycle_number)
  VALUES (_account_id, sub.id, amount, sub.next_due_on, date_trunc('month', sub.next_due_on)::date, _paid_at, _method, 'confirmed', nullif(trim(_transaction_id), ''), 'admin_manual', now(), _actor_user_id, cyc)
  RETURNING id INTO pay_id;
  UPDATE public.account_subscriptions SET status = 'active', restricted_at = NULL,
    next_due_on = (sub.next_due_on + interval '1 month')::date, billing_period = date_trunc('month', sub.next_due_on + interval '1 month')::date,
    contracted_price_cents = public.subscription_cycle_price(cyc + 1, sub.promo_price_cents, sub.promo_cycles, sub.regular_price_cents), updated_at = now()
  WHERE id = sub.id;
  INSERT INTO public.subscription_events(subscription_id, account_id, actor_user_id, event_type, previous_status, new_status, changed_fields, note)
  VALUES (sub.id, _account_id, _actor_user_id, 'payment.confirmed', sub.status, 'active', ARRAY['next_due_on','status'], 'Ciclo ' || cyc);
  INSERT INTO public.access_grant_events(account_id, actor_user_id, action, new_values)
  VALUES (_account_id, _actor_user_id, 'payment.confirmed', jsonb_build_object('cycle', cyc, 'amount_cents', amount, 'paid_at', _paid_at));
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'payment.record', 'payment', pay_id, _account_id, ARRAY['status'], 'success');
  PERFORM public.suppress_resolved_trial_notifications(_account_id);
  RETURN pay_id;
END; $$;

CREATE OR REPLACE FUNCTION public.account_commercial_summary(_account_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'state', public.account_commercial_state(a.id),
    'trial', (SELECT jsonb_build_object('kind', g.kind, 'starts_at', g.starts_at, 'ends_at', g.ends_at, 'reason', g.reason, 'notes', g.notes, 'convertible', g.convertible, 'billing_starts_on', g.billing_starts_on, 'revoked_at', g.revoked_at)
              FROM public.access_grants g WHERE g.account_id = a.id AND g.kind <> 'legacy' ORDER BY g.revoked_at IS NULL DESC, g.ends_at DESC LIMIT 1),
    'legacy', EXISTS (SELECT 1 FROM public.access_grants g WHERE g.account_id = a.id AND g.kind = 'legacy' AND g.revoked_at IS NULL),
    'subscription', (SELECT jsonb_build_object('status', s.status, 'next_due_on', s.next_due_on, 'next_amount_cents', s.contracted_price_cents, 'promo_price_cents', s.promo_price_cents, 'promo_cycles', s.promo_cycles, 'regular_price_cents', s.regular_price_cents,
              'paid_cycles', (SELECT count(*) FROM public.payments p WHERE p.subscription_id = s.id AND p.status = 'confirmed'))
              FROM public.account_subscriptions s WHERE s.account_id = a.id)
  ) FROM public.accounts a WHERE a.id = _account_id
$$;

CREATE OR REPLACE FUNCTION public.admin_subscription_overview(_actor_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id, true);
  WITH st AS (SELECT a.id, public.account_commercial_state(a.id) AS state FROM public.accounts a WHERE a.status <> 'closed')
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM st),
    'trial', (SELECT count(*) FROM st WHERE state = 'trial'),
    'trial_ending', (SELECT count(*) FROM st JOIN public.access_grants g ON g.account_id = st.id AND g.kind = 'standard_trial' WHERE st.state = 'trial' AND g.ends_at <= now() + interval '2 days'),
    'expired', (SELECT count(*) FROM st WHERE state = 'awaiting_contract'),
    'admin_trial', (SELECT count(*) FROM st WHERE state = 'admin_trial'),
    'active', (SELECT count(*) FROM st WHERE state = 'active'),
    'legacy', (SELECT count(*) FROM st WHERE state = 'legacy'),
    'pending', (SELECT count(*) FROM st WHERE state = 'payment_pending'),
    'overdue_or_suspended', (SELECT count(*) FROM st WHERE state IN ('overdue','suspended')),
    'revenue_month_cents', (SELECT coalesce(sum(amount_cents), 0) FROM public.payments WHERE status = 'confirmed' AND confirmed_at >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'),
    'last_job', (SELECT jsonb_build_object('started_at', started_at, 'finished_at', finished_at, 'failures', failures, 'result', result) FROM public.subscription_job_runs ORDER BY started_at DESC LIMIT 1)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_subscription_directory(_actor_user_id uuid, _search text, _state text, _page integer, _page_size integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb; q text := lower(coalesce(trim(_search), '')); lim integer := least(greatest(coalesce(_page_size, 20), 1), 50); off integer := greatest(coalesce(_page, 1) - 1, 0) * least(greatest(coalesce(_page_size, 20), 1), 50);
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id, true);
  WITH base AS (
    SELECT a.id AS account_id, a.created_at, p.full_name, u.email::text AS email, public.account_commercial_summary(a.id) AS summary
    FROM public.accounts a
    LEFT JOIN public.profiles p ON p.id = a.owner_user_id
    LEFT JOIN auth.users u ON u.id = a.owner_user_id
    WHERE a.status <> 'closed'
      AND (q = '' OR lower(coalesce(p.full_name, '')) LIKE '%' || q || '%' OR lower(coalesce(u.email::text, '')) LIKE '%' || q || '%')
  ), filtered AS (SELECT * FROM base WHERE coalesce(_state, 'all') = 'all' OR summary->>'state' = _state)
  SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC) FROM (SELECT * FROM filtered ORDER BY created_at DESC LIMIT lim OFFSET off) f), '[]'::jsonb))
  INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_subscription_detail(_actor_user_id uuid, _account_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id, true);
  SELECT jsonb_build_object(
    'account_id', a.id, 'created_at', a.created_at, 'account_status', a.status, 'full_name', p.full_name, 'email', u.email,
    'summary', public.account_commercial_summary(a.id),
    'events', coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC) FROM (SELECT action, previous_values, new_values, reason, created_at, actor_user_id FROM public.access_grant_events WHERE account_id = a.id ORDER BY created_at DESC LIMIT 50) e), '[]'::jsonb),
    'notifications', coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC) FROM (SELECT kind, title, in_app_status, external_status, attempts, last_error, read_at, suppressed_at, created_at FROM public.professional_notifications WHERE account_id = a.id ORDER BY created_at DESC LIMIT 50) n), '[]'::jsonb),
    'payments', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.cycle_number DESC NULLS LAST) FROM (SELECT cycle_number, amount_cents, due_on, paid_at, status, method FROM public.payments WHERE account_id = a.id ORDER BY created_at DESC LIMIT 50) x), '[]'::jsonb)
  ) INTO result
  FROM public.accounts a LEFT JOIN public.profiles p ON p.id = a.owner_user_id LEFT JOIN auth.users u ON u.id = a.owner_user_id
  WHERE a.id = _account_id;
  IF result IS NULL THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.process_trial_lifecycle(_source text DEFAULT 'schedule')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.access_grants%ROWTYPE; st text; n integer; day5 integer := 0; ended integer := 0; expired integer := 0; fails integer := 0; errs jsonb := '[]'::jsonb; run_id uuid; res jsonb;
BEGIN
  INSERT INTO public.subscription_job_runs(trigger_source) VALUES (coalesce(_source, 'schedule')) RETURNING id INTO run_id;
  FOR g IN SELECT * FROM public.access_grants WHERE kind = 'standard_trial' AND revoked_at IS NULL AND starts_at + interval '5 days' <= now() LOOP
    BEGIN
      st := public.account_commercial_state(g.account_id);
      IF st = 'trial' AND now() < g.ends_at THEN
        INSERT INTO public.professional_notifications(account_id, event_key, kind, title, body, action_path)
        VALUES (g.account_id, 'trial_day5:' || g.id, 'trial_day5', 'Seu período de degustação está terminando',
          'Olá! Seu período gratuito da TeraClini está chegando ao fim. Faltam aproximadamente 2 dias para terminar o seu teste de 7 dias. Para continuar utilizando seu sistema, faça a contratação da assinatura. Nos três primeiros ciclos pagos, o valor será de R$ 47,00 por mês; depois, R$ 59,90 por mês.', '/assinatura')
        ON CONFLICT (event_key) DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT; day5 := day5 + n;
      ELSIF st = 'awaiting_contract' AND now() >= g.ends_at THEN
        INSERT INTO public.professional_notifications(account_id, event_key, kind, title, body, action_path)
        VALUES (g.account_id, 'trial_ended:' || g.id || ':' || to_char(g.ends_at, 'YYYYMMDDHH24MISS'), 'trial_ended', 'Seu período gratuito terminou',
          'Seu período gratuito da TeraClini terminou. Para continuar utilizando o sistema, conclua a contratação da sua assinatura. Seus dados permanecem preservados de acordo com a política de retenção da plataforma.', '/assinatura')
        ON CONFLICT (event_key) DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT; ended := ended + n;
        IF g.expired_at IS NULL THEN
          UPDATE public.access_grants SET expired_at = now(), updated_at = now() WHERE id = g.id;
          INSERT INTO public.access_grant_events(account_id, grant_id, action, new_values) VALUES (g.account_id, g.id, 'trial.expired', jsonb_build_object('ends_at', g.ends_at));
          expired := expired + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      fails := fails + 1; errs := errs || jsonb_build_object('grant_id', g.id, 'error', SQLERRM);
    END;
  END LOOP;
  UPDATE public.professional_notifications pn SET suppressed_at = now()
  WHERE pn.kind IN ('trial_day5','trial_ended') AND pn.suppressed_at IS NULL
    AND public.account_commercial_state(pn.account_id) IN ('active','payment_pending','legacy','admin_trial');
  res := jsonb_build_object('day5_created', day5, 'ended_created', ended, 'expired', expired, 'errors', errs);
  UPDATE public.subscription_job_runs SET finished_at = now(), result = res, failures = fails WHERE id = run_id;
  RETURN res;
END; $$;

CREATE OR REPLACE FUNCTION public.my_commercial_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE acc uuid;
BEGIN
  SELECT am.account_id INTO acc FROM public.account_members am WHERE am.user_id = auth.uid() AND am.status = 'active' ORDER BY am.created_at LIMIT 1;
  IF acc IS NULL THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  RETURN public.account_commercial_summary(acc) || jsonb_build_object(
    'contract_requested_at', (SELECT max(created_at) FROM public.access_grant_events WHERE account_id = acc AND action = 'contract.requested'),
    'notifications', coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC) FROM (SELECT id, kind, title, body, action_path, read_at, created_at FROM public.professional_notifications WHERE account_id = acc AND suppressed_at IS NULL ORDER BY created_at DESC LIMIT 10) n), '[]'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.mark_my_notification_read(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.professional_notifications n SET read_at = coalesce(read_at, now())
  WHERE n.id = _id AND EXISTS (SELECT 1 FROM public.account_members am WHERE am.account_id = n.account_id AND am.user_id = auth.uid() AND am.status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.request_subscription_contract()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE acc uuid;
BEGIN
  SELECT am.account_id INTO acc FROM public.account_members am WHERE am.user_id = auth.uid() AND am.status = 'active' ORDER BY am.created_at LIMIT 1;
  IF acc IS NULL THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  IF EXISTS (SELECT 1 FROM public.access_grant_events WHERE account_id = acc AND action = 'contract.requested' AND created_at > now() - interval '1 day') THEN RETURN; END IF;
  INSERT INTO public.access_grant_events(account_id, actor_user_id, action) VALUES (acc, auth.uid(), 'contract.requested');
END; $$;

REVOKE ALL ON FUNCTION public.account_commercial_state(uuid), public.has_commercial_access(uuid), public.account_commercial_summary(uuid),
  public.assert_billing_admin(uuid, boolean), public.suppress_resolved_trial_notifications(uuid),
  public.admin_grant_trial(uuid, uuid, integer, timestamptz, text, text, boolean, date), public.admin_extend_access(uuid, uuid, integer, text),
  public.admin_revoke_access_grant(uuid, uuid, text), public.admin_configure_billing(uuid, uuid, date, integer, integer, integer),
  public.admin_record_subscription_payment(uuid, uuid, timestamptz, text, text), public.admin_subscription_overview(uuid),
  public.admin_subscription_directory(uuid, text, text, integer, integer), public.admin_subscription_detail(uuid, uuid),
  public.process_trial_lifecycle(text), public.my_commercial_status(), public.mark_my_notification_read(uuid), public.request_subscription_contract(),
  public.start_standard_trial_on_onboarding() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_commercial_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.account_commercial_state(uuid), public.account_commercial_summary(uuid), public.assert_billing_admin(uuid, boolean), public.suppress_resolved_trial_notifications(uuid),
  public.admin_grant_trial(uuid, uuid, integer, timestamptz, text, text, boolean, date), public.admin_extend_access(uuid, uuid, integer, text),
  public.admin_revoke_access_grant(uuid, uuid, text), public.admin_configure_billing(uuid, uuid, date, integer, integer, integer),
  public.admin_record_subscription_payment(uuid, uuid, timestamptz, text, text), public.admin_subscription_overview(uuid),
  public.admin_subscription_directory(uuid, text, text, integer, integer), public.admin_subscription_detail(uuid, uuid),
  public.process_trial_lifecycle(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_commercial_status(), public.mark_my_notification_read(uuid), public.request_subscription_contract() TO authenticated;