CREATE OR REPLACE FUNCTION public.admin_manage_subscription(
  _actor_user_id UUID,
  _account_id UUID,
  _action TEXT,
  _plan_id UUID DEFAULT NULL,
  _days INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_role public.platform_admin_role;
  _subscription public.account_subscriptions%ROWTYPE;
  _plan public.subscription_plans%ROWTYPE;
  _subscription_id UUID;
  _previous_status public.subscription_status;
  _next_status public.subscription_status;
  _changed_fields TEXT[] := '{}';
  _now TIMESTAMPTZ := now();
  _today DATE := current_date;
BEGIN
  SELECT role INTO _admin_role
  FROM public.platform_admins
  WHERE user_id = _actor_user_id AND revoked_at IS NULL;

  IF _admin_role IS NULL OR _admin_role NOT IN ('super_admin', 'finance_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = _account_id
  ) THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;

  SELECT * INTO _subscription
  FROM public.account_subscriptions
  WHERE account_id = _account_id
  FOR UPDATE;

  IF _action = 'create' THEN
    IF _subscription.id IS NOT NULL THEN RAISE EXCEPTION 'Esta conta já possui uma licença'; END IF;
    IF _plan_id IS NULL THEN RAISE EXCEPTION 'Selecione um plano'; END IF;
    SELECT * INTO _plan FROM public.subscription_plans WHERE id = _plan_id AND is_active = true;
    IF _plan.id IS NULL THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;

    INSERT INTO public.account_subscriptions (
      account_id, plan_id, contracted_price_cents, currency, starts_on,
      next_due_on, billing_period, status
    ) VALUES (
      _account_id, _plan.id, _plan.price_cents, _plan.currency, _today,
      _today + _plan.first_payment_days, _today, 'awaiting_first_payment'
    ) RETURNING id INTO _subscription_id;
    _next_status := 'awaiting_first_payment';
    _changed_fields := ARRAY['plan_id', 'status', 'starts_on', 'next_due_on'];
  ELSE
    IF _subscription.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada'; END IF;
    _subscription_id := _subscription.id;
    _previous_status := _subscription.status;
    _next_status := _subscription.status;

    CASE _action
      WHEN 'change_plan' THEN
        IF _plan_id IS NULL THEN RAISE EXCEPTION 'Selecione um plano'; END IF;
        SELECT * INTO _plan FROM public.subscription_plans WHERE id = _plan_id AND is_active = true;
        IF _plan.id IS NULL THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;
        UPDATE public.account_subscriptions SET
          plan_id = _plan.id,
          contracted_price_cents = _plan.price_cents,
          currency = _plan.currency
        WHERE id = _subscription_id;
        _changed_fields := ARRAY['plan_id', 'contracted_price_cents', 'currency'];
      WHEN 'activate', 'reactivate' THEN
        UPDATE public.account_subscriptions SET
          status = 'active', cancelled_at = NULL,
          cancellation_requested_at = NULL, restricted_at = NULL
        WHERE id = _subscription_id;
        _next_status := 'active';
        _changed_fields := ARRAY['status'];
      WHEN 'restrict' THEN
        UPDATE public.account_subscriptions SET status = 'restricted', restricted_at = _now
        WHERE id = _subscription_id;
        _next_status := 'restricted';
        _changed_fields := ARRAY['status', 'restricted_at'];
      WHEN 'cancel' THEN
        UPDATE public.account_subscriptions SET
          status = 'cancelled', cancellation_requested_at = _now, cancelled_at = _now,
          restricted_at = NULL
        WHERE id = _subscription_id;
        _next_status := 'cancelled';
        _changed_fields := ARRAY['status', 'cancelled_at'];
      WHEN 'extend' THEN
        IF _days IS NULL OR _days < 1 OR _days > 365 THEN RAISE EXCEPTION 'Prazo inválido'; END IF;
        UPDATE public.account_subscriptions SET next_due_on = next_due_on + _days
        WHERE id = _subscription_id;
        _changed_fields := ARRAY['next_due_on'];
      ELSE
        RAISE EXCEPTION 'Ação inválida';
    END CASE;
  END IF;

  INSERT INTO public.subscription_events (
    subscription_id, account_id, actor_user_id, event_type,
    previous_status, new_status, changed_fields
  ) VALUES (
    _subscription_id, _account_id, _actor_user_id, _action,
    _previous_status, _next_status, _changed_fields
  );

  INSERT INTO public.platform_audit_events (
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result
  ) VALUES (
    _actor_user_id, 'subscription.' || _action, 'subscription',
    _subscription_id, _account_id, _changed_fields, 'success'
  );

  RETURN _subscription_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_manage_subscription(UUID, UUID, TEXT, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_subscription(UUID, UUID, TEXT, UUID, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_confirm_payment(
  _actor_user_id UUID,
  _payment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_role public.platform_admin_role;
  _payment public.payments%ROWTYPE;
  _now TIMESTAMPTZ := now();
BEGIN
  SELECT role INTO _admin_role
  FROM public.platform_admins
  WHERE user_id = _actor_user_id AND revoked_at IS NULL;

  IF _admin_role IS NULL OR _admin_role NOT IN ('super_admin', 'finance_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _payment FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF _payment.id IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF _payment.status = 'confirmed' THEN RETURN false; END IF;
  IF _payment.status IN ('refunded', 'cancelled') THEN
    RAISE EXCEPTION 'Este pagamento não pode ser confirmado';
  END IF;

  UPDATE public.payments SET
    status = 'confirmed', paid_at = _now, confirmed_at = _now,
    confirmed_by = _actor_user_id, confirmation_source = 'manual_admin'
  WHERE id = _payment.id;

  INSERT INTO public.payment_events (
    payment_id, account_id, actor_user_id, event_type,
    previous_status, new_status, amount_cents
  ) VALUES (
    _payment.id, _payment.account_id, _actor_user_id, 'manual_confirmation',
    _payment.status, 'confirmed', _payment.amount_cents
  );

  INSERT INTO public.platform_audit_events (
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result
  ) VALUES (
    _actor_user_id, 'payment.confirm', 'payment', _payment.id, _payment.account_id,
    ARRAY['status', 'paid_at', 'confirmed_at', 'confirmed_by', 'confirmation_source'], 'success'
  );

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_confirm_payment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_payment(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.admin_manage_subscription(UUID, UUID, TEXT, UUID, INTEGER) IS 'Atomically changes a manual subscription and records non-clinical immutable histories.';
COMMENT ON FUNCTION public.admin_confirm_payment(UUID, UUID) IS 'Atomically confirms a manual payment and records non-clinical immutable histories.';