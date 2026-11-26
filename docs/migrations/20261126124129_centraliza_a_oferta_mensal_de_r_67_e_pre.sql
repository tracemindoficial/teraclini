-- Centraliza a oferta mensal de R$ 67 e preserva contratos existentes
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-11-26T15:41:29.375Z

INSERT INTO public.subscription_plans (code, name, price_cents, currency, billing_interval_months, first_payment_days, is_active, promotional_until)
VALUES ('teraclini_mensal', 'Plano Completo', 6700, 'BRL', 1, 7, true, NULL)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency, billing_interval_months = EXCLUDED.billing_interval_months,
  promotional_until = NULL, is_active = true, updated_at = now()
WHERE (subscription_plans.name, subscription_plans.price_cents, subscription_plans.currency,
       subscription_plans.billing_interval_months, subscription_plans.is_active, subscription_plans.promotional_until)
  IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.price_cents, EXCLUDED.currency,
                    EXCLUDED.billing_interval_months, EXCLUDED.is_active, EXCLUDED.promotional_until);

-- Keep the old RPC parameter names callable across deploys. Money always comes
-- from the catalogue for new subscriptions and from the contract for existing ones.
CREATE OR REPLACE FUNCTION public.admin_configure_billing(
  _actor_user_id uuid, _account_id uuid, _first_due_on date,
  _promo_price_cents integer DEFAULT NULL, _promo_cycles integer DEFAULT NULL,
  _regular_price_cents integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  offer public.subscription_plans%ROWTYPE;
  prev public.account_subscriptions%ROWTYPE;
  saved public.account_subscriptions%ROWTYPE;
  fields text[] := ARRAY['next_due_on'];
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id);
  IF _first_due_on IS NULL OR _first_due_on < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'O vencimento não pode ser no passado.';
  END IF;
  PERFORM 1 FROM public.accounts WHERE id = _account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  SELECT * INTO prev FROM public.account_subscriptions WHERE account_id = _account_id FOR UPDATE;

  IF prev.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.access_grants WHERE account_id = _account_id AND kind = 'admin_trial' AND revoked_at IS NULL AND ends_at > now() AND NOT convertible) THEN
      RAISE EXCEPTION 'A degustação vigente foi marcada como não conversível.';
    END IF;
    SELECT * INTO offer FROM public.subscription_plans
    WHERE code = 'teraclini_mensal' AND is_active AND currency = 'BRL' AND billing_interval_months = 1 AND price_cents > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'O Plano Completo mensal está indisponível.'; END IF;
    INSERT INTO public.account_subscriptions(account_id, plan_id, contracted_price_cents, currency, starts_on, next_due_on, billing_period, status, promo_price_cents, promo_cycles, regular_price_cents, configured_by, configured_at)
    VALUES (_account_id, offer.id, offer.price_cents, offer.currency, _first_due_on, _first_due_on, date_trunc('month', _first_due_on)::date, 'awaiting_first_payment', offer.price_cents, 0, offer.price_cents, _actor_user_id, now())
    RETURNING * INTO saved;
    fields := fields || ARRAY['plan_id','status','promo_price_cents','promo_cycles','regular_price_cents','contracted_price_cents'];
  ELSE
    IF prev.status = 'cancelled' THEN RAISE EXCEPTION 'Reative a assinatura antes de alterar o vencimento.'; END IF;
    UPDATE public.account_subscriptions SET next_due_on = _first_due_on, billing_period = date_trunc('month', _first_due_on)::date,
      configured_by = _actor_user_id, configured_at = now(), updated_at = now()
    WHERE id = prev.id RETURNING * INTO saved;
  END IF;

  INSERT INTO public.access_grant_events(account_id, actor_user_id, action, previous_values, new_values)
  VALUES (_account_id, _actor_user_id, 'billing.configured',
    CASE WHEN prev.id IS NOT NULL THEN jsonb_build_object('next_due_on', prev.next_due_on, 'promo_price_cents', prev.promo_price_cents, 'promo_cycles', prev.promo_cycles, 'regular_price_cents', prev.regular_price_cents) END,
    jsonb_build_object('next_due_on', saved.next_due_on, 'promo_price_cents', saved.promo_price_cents, 'promo_cycles', saved.promo_cycles, 'regular_price_cents', saved.regular_price_cents));
  INSERT INTO public.subscription_events(subscription_id, account_id, actor_user_id, event_type, previous_status, new_status, changed_fields)
  VALUES (saved.id, _account_id, _actor_user_id, 'billing.configured', prev.status, saved.status, fields);
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'billing.configure', 'subscription', saved.id, _account_id, fields, 'success');
  RETURN saved.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_manage_subscription(
  _actor_user_id uuid, _account_id uuid, _action text, _plan_id uuid DEFAULT NULL, _days integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _admin_role public.platform_admin_role;
  _subscription public.account_subscriptions%ROWTYPE;
  _plan public.subscription_plans%ROWTYPE;
  _subscription_id uuid;
  _previous_status public.subscription_status;
  _next_status public.subscription_status;
  _changed_fields text[] := '{}';
  _now timestamptz := now();
BEGIN
  SELECT role INTO _admin_role FROM public.platform_admins WHERE user_id = _actor_user_id AND revoked_at IS NULL;
  IF _admin_role IS NULL OR _admin_role NOT IN ('super_admin', 'finance_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id) THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  IF _action = 'create' THEN
    PERFORM 1 FROM public.accounts WHERE id = _account_id FOR UPDATE;
  END IF;
  SELECT * INTO _subscription FROM public.account_subscriptions WHERE account_id = _account_id FOR UPDATE;

  IF _action = 'create' THEN
    IF _subscription.id IS NOT NULL THEN RAISE EXCEPTION 'Esta conta já possui uma licença'; END IF;
    SELECT * INTO _plan FROM public.subscription_plans WHERE id = _plan_id AND code = 'teraclini_mensal' AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Selecione o Plano Completo vigente'; END IF;
    RETURN public.admin_configure_billing(_actor_user_id, _account_id, (_now AT TIME ZONE 'America/Sao_Paulo')::date + _plan.first_payment_days);
  END IF;

  IF _subscription.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada'; END IF;
  _subscription_id := _subscription.id;
  _previous_status := _subscription.status;
  _next_status := _subscription.status;
  CASE _action
    WHEN 'change_plan' THEN
      IF _plan_id IS NULL THEN RAISE EXCEPTION 'Selecione um plano'; END IF;
      SELECT * INTO _plan FROM public.subscription_plans WHERE id = _plan_id AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;
      UPDATE public.account_subscriptions SET plan_id = _plan.id WHERE id = _subscription_id;
      _changed_fields := ARRAY['plan_id'];
    WHEN 'activate', 'reactivate' THEN
      UPDATE public.account_subscriptions SET status = 'active', cancelled_at = NULL,
        cancellation_requested_at = NULL, restricted_at = NULL WHERE id = _subscription_id;
      _next_status := 'active';
      _changed_fields := ARRAY['status'];
    WHEN 'restrict' THEN
      UPDATE public.account_subscriptions SET status = 'restricted', restricted_at = _now WHERE id = _subscription_id;
      _next_status := 'restricted';
      _changed_fields := ARRAY['status', 'restricted_at'];
    WHEN 'cancel' THEN
      UPDATE public.account_subscriptions SET status = 'cancelled', cancellation_requested_at = _now,
        cancelled_at = _now, restricted_at = NULL WHERE id = _subscription_id;
      _next_status := 'cancelled';
      _changed_fields := ARRAY['status', 'cancelled_at'];
    WHEN 'extend' THEN
      IF _days IS NULL OR _days < 1 OR _days > 365 THEN RAISE EXCEPTION 'Prazo inválido'; END IF;
      UPDATE public.account_subscriptions SET next_due_on = next_due_on + _days WHERE id = _subscription_id;
      _changed_fields := ARRAY['next_due_on'];
    ELSE RAISE EXCEPTION 'Ação inválida';
  END CASE;
  INSERT INTO public.subscription_events(subscription_id, account_id, actor_user_id, event_type, previous_status, new_status, changed_fields)
  VALUES (_subscription_id, _account_id, _actor_user_id, _action, _previous_status, _next_status, _changed_fields);
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'subscription.' || _action, 'subscription', _subscription_id, _account_id, _changed_fields, 'success');
  RETURN _subscription_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_trial_lifecycle(_source text DEFAULT 'schedule')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  g public.access_grants%ROWTYPE; st text; n integer; day5 integer := 0; ended integer := 0;
  expired integer := 0; fails integer := 0; errs jsonb := '[]'::jsonb; run_id uuid; res jsonb; offer_message text;
BEGIN
  SELECT format(' Novas assinaturas do %s: R$ %s por mês, sem aumento automático por ciclo. A contratação é concluída com a equipe TeraClini.',
    name, replace(to_char(price_cents::numeric / 100, 'FM9999999990.00'), '.', ','))
  INTO offer_message FROM public.subscription_plans
  WHERE code = 'teraclini_mensal' AND is_active AND currency = 'BRL' AND billing_interval_months = 1 AND price_cents > 0;
  INSERT INTO public.subscription_job_runs(trigger_source) VALUES (coalesce(_source, 'schedule')) RETURNING id INTO run_id;
  FOR g IN SELECT * FROM public.access_grants WHERE kind = 'standard_trial' AND revoked_at IS NULL AND starts_at + interval '5 days' <= now() LOOP
    BEGIN
      st := public.account_commercial_state(g.account_id);
      IF st = 'trial' AND now() < g.ends_at THEN
        INSERT INTO public.professional_notifications(account_id, event_key, kind, title, body, action_path)
        VALUES (g.account_id, 'trial_day5:' || g.id, 'trial_day5', 'Seu período de degustação está terminando',
          'Seu teste gratuito da TeraClini está chegando ao fim. Consulte as condições da sua assinatura no portal.' ||
          CASE WHEN EXISTS (SELECT 1 FROM public.account_subscriptions s WHERE s.account_id = g.account_id) THEN '' ELSE coalesce(offer_message, '') END,
          '/assinatura')
        ON CONFLICT (event_key) DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT; day5 := day5 + n;
      ELSIF st = 'awaiting_contract' AND now() >= g.ends_at THEN
        INSERT INTO public.professional_notifications(account_id, event_key, kind, title, body, action_path)
        VALUES (g.account_id, 'trial_ended:' || g.id || ':' || to_char(g.ends_at, 'YYYYMMDDHH24MISS'), 'trial_ended', 'Seu período gratuito terminou',
          'Seu período gratuito da TeraClini terminou. Para continuar utilizando o sistema, conclua a contratação da sua assinatura. Seus dados permanecem preservados de acordo com a política de retenção da plataforma.' ||
          CASE WHEN EXISTS (SELECT 1 FROM public.account_subscriptions s WHERE s.account_id = g.account_id) THEN '' ELSE coalesce(offer_message, '') END,
          '/assinatura')
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
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_configure_billing(uuid, uuid, date, integer, integer, integer), public.admin_manage_subscription(uuid, uuid, text, uuid, integer), public.process_trial_lifecycle(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_configure_billing(uuid, uuid, date, integer, integer, integer), public.admin_manage_subscription(uuid, uuid, text, uuid, integer), public.process_trial_lifecycle(text) TO service_role;
NOTIFY pgrst, 'reload schema';
