CREATE OR REPLACE FUNCTION public.admin_professional_row(_account_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  acc public.accounts%ROWTYPE; sub public.account_subscriptions%ROWTYPE;
  onboarded boolean; g_free public.access_grants%ROWTYPE; g_trial public.access_grants%ROWTYPE;
  any_grant boolean; open_pay record; last_act timestamptz; st text; access text; fin text;
BEGIN
  SELECT * INTO acc FROM public.accounts WHERE id = _account_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO sub FROM public.account_subscriptions WHERE account_id = _account_id;
  SELECT coalesce(bool_or(p.onboarding_completed), false) INTO onboarded FROM public.profiles p WHERE p.account_id = _account_id;
  SELECT * INTO g_free FROM public.access_grants g WHERE g.account_id = _account_id AND g.revoked_at IS NULL
    AND (g.kind = 'legacy' OR (g.kind = 'admin_trial' AND g.starts_at <= now() AND g.ends_at > now()))
    ORDER BY (g.kind = 'admin_trial') DESC, g.ends_at DESC LIMIT 1;
  SELECT * INTO g_trial FROM public.access_grants g WHERE g.account_id = _account_id AND g.kind = 'standard_trial' AND g.revoked_at IS NULL
    ORDER BY g.ends_at DESC LIMIT 1;
  any_grant := EXISTS (SELECT 1 FROM public.access_grants g WHERE g.account_id = _account_id AND g.kind <> 'legacy');
  SELECT p.amount_cents, p.due_on INTO open_pay FROM public.payments p
    WHERE p.account_id = _account_id AND p.status::text NOT IN ('confirmed','cancelled','refunded') AND p.paid_at IS NULL
    ORDER BY p.due_on LIMIT 1;
  SELECT max(u.occurred_at) INTO last_act FROM public.usage_events u WHERE u.account_id = _account_id;

  st := CASE
    WHEN acc.status <> 'active' OR acc.blocked_at IS NOT NULL THEN 'suspended'
    WHEN NOT onboarded THEN 'incomplete'
    WHEN open_pay.due_on IS NOT NULL AND open_pay.due_on < current_date THEN 'overdue'
    WHEN open_pay.due_on IS NULL AND sub.status::text IN ('payment_pending','grace_period','awaiting_first_payment') AND sub.next_due_on < current_date THEN 'overdue'
    WHEN open_pay.due_on IS NOT NULL OR (sub.id IS NOT NULL AND sub.status::text IN ('payment_pending','grace_period','awaiting_first_payment')) THEN 'payment_pending'
    WHEN sub.id IS NOT NULL AND sub.status::text IN ('active','cancellation_requested') THEN 'active'
    WHEN g_free.id IS NOT NULL THEN 'free'
    WHEN g_trial.id IS NOT NULL AND g_trial.starts_at <= now() AND g_trial.ends_at > now() AND g_trial.ends_at <= now() + interval '2 days' THEN 'trial_ending'
    WHEN g_trial.id IS NOT NULL AND g_trial.starts_at <= now() AND g_trial.ends_at > now() THEN 'trial'
    WHEN sub.id IS NOT NULL AND sub.status::text = 'restricted' THEN 'overdue'
    WHEN sub.id IS NOT NULL AND sub.status::text = 'cancelled' THEN 'cancelled'
    WHEN any_grant THEN 'trial_expired'
    ELSE 'recent' END;
  access := CASE
    WHEN sub.id IS NOT NULL AND sub.status::text IN ('active','cancellation_requested','payment_pending','grace_period','restricted') THEN 'paid'
    WHEN g_free.id IS NOT NULL AND g_free.kind = 'legacy' THEN 'legacy'
    WHEN g_free.id IS NOT NULL THEN 'admin_free'
    WHEN g_trial.id IS NOT NULL THEN 'trial'
    ELSE 'none' END;
  fin := CASE
    WHEN open_pay.due_on IS NOT NULL AND open_pay.due_on < current_date THEN 'overdue'
    WHEN open_pay.due_on IS NULL AND sub.status::text IN ('payment_pending','grace_period','awaiting_first_payment') AND sub.next_due_on < current_date THEN 'overdue'
    WHEN open_pay.due_on IS NOT NULL THEN 'pending'
    WHEN sub.id IS NOT NULL AND sub.status::text IN ('payment_pending','grace_period','awaiting_first_payment') THEN 'pending'
    WHEN sub.id IS NOT NULL AND sub.status::text IN ('active','cancellation_requested') THEN 'up_to_date'
    ELSE 'not_configured' END;

  RETURN jsonb_build_object(
    'status', st, 'access_type', access, 'financial', fin,
    'access_ends_at', CASE WHEN g_free.id IS NOT NULL AND g_free.kind = 'admin_trial' THEN g_free.ends_at
                           WHEN st IN ('trial','trial_ending','trial_expired') THEN g_trial.ends_at END,
    'next_due_on', coalesce(open_pay.due_on, CASE WHEN sub.status::text IN ('active','cancellation_requested','payment_pending','grace_period','awaiting_first_payment') THEN sub.next_due_on END),
    'next_amount_cents', coalesce(open_pay.amount_cents, CASE WHEN sub.status::text IN ('active','cancellation_requested','payment_pending','grace_period','awaiting_first_payment') THEN sub.contracted_price_cents END),
    'last_activity_at', last_act, 'onboarded', onboarded);
END; $$;
REVOKE ALL ON FUNCTION public.admin_professional_row(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_professional_row(uuid) TO service_role;