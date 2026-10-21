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
    WHEN open_pay.due_on IS NOT NULL OR (sub.id IS NOT NULL AND sub.status::text IN ('payment_pending','grace_period')) THEN 'payment_pending'
    WHEN sub.id IS NOT NULL AND sub.status::text IN ('active','cancellation_requested') THEN 'active'
    WHEN g_free.id IS NOT NULL THEN 'free'
    WHEN g_trial.id IS NOT NULL AND g_trial.starts_at <= now() AND g_trial.ends_at > now() AND g_trial.ends_at <= now() + interval '2 days' THEN 'trial_ending'
    WHEN g_trial.id IS NOT NULL AND g_trial.starts_at <= now() AND g_trial.ends_at > now() THEN 'trial'
    WHEN sub.id IS NOT NULL AND sub.status::text = 'restricted' THEN 'overdue'
    WHEN sub.id IS NOT NULL AND sub.status::text = 'cancelled' THEN 'cancelled'
    WHEN any_grant THEN 'trial_expired'
    ELSE 'recent' END;
  access := CASE
    WHEN sub.id IS NOT NULL AND sub.status::text NOT IN ('cancelled') THEN 'paid'
    WHEN g_free.id IS NOT NULL AND g_free.kind = 'legacy' THEN 'legacy'
    WHEN g_free.id IS NOT NULL THEN 'admin_free'
    WHEN g_trial.id IS NOT NULL THEN 'trial'
    ELSE 'none' END;
  fin := CASE
    WHEN open_pay.due_on IS NOT NULL AND open_pay.due_on < current_date THEN 'overdue'
    WHEN open_pay.due_on IS NOT NULL THEN 'pending'
    WHEN sub.id IS NOT NULL AND sub.status::text IN ('active','cancellation_requested') THEN 'up_to_date'
    ELSE 'not_configured' END;

  RETURN jsonb_build_object(
    'status', st, 'access_type', access, 'financial', fin,
    'access_ends_at', CASE WHEN g_free.id IS NOT NULL AND g_free.kind = 'admin_trial' THEN g_free.ends_at
                           WHEN st IN ('trial','trial_ending','trial_expired') THEN g_trial.ends_at END,
    'next_due_on', coalesce(open_pay.due_on, CASE WHEN sub.status::text IN ('active','cancellation_requested','payment_pending','grace_period') THEN sub.next_due_on END),
    'next_amount_cents', coalesce(open_pay.amount_cents, CASE WHEN sub.status::text IN ('active','cancellation_requested','payment_pending','grace_period') THEN sub.contracted_price_cents END),
    'last_activity_at', last_act, 'onboarded', onboarded);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_professional_directory(_actor_user_id uuid, _search text, _status text, _access text, _financial text, _from date, _to date, _sort text, _page integer, _page_size integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE result jsonb; q text := lower(coalesce(trim(_search), ''));
  lim integer := least(greatest(coalesce(_page_size, 20), 1), 50);
  off integer := greatest(coalesce(_page, 1) - 1, 0) * least(greatest(coalesce(_page_size, 20), 1), 50);
BEGIN
  PERFORM public.assert_billing_admin(_actor_user_id, true);
  WITH base AS (
    SELECT a.id AS account_id, a.owner_user_id AS user_id, a.created_at, p.full_name, u.email::text AS email,
           public.admin_professional_row(a.id) AS info
    FROM public.accounts a
    LEFT JOIN public.profiles p ON p.id = a.owner_user_id
    LEFT JOIN auth.users u ON u.id = a.owner_user_id
    WHERE a.status <> 'closed' AND a.deleted_identity_at IS NULL
  ), counts AS (
    SELECT jsonb_build_object(
      'total', count(*),
      'incomplete', count(*) FILTER (WHERE info->>'status' = 'incomplete'),
      'with_access', count(*) FILTER (WHERE info->>'status' IN ('active','payment_pending','free','trial','trial_ending')),
      'trial', count(*) FILTER (WHERE info->>'status' IN ('trial','trial_ending')),
      'trial_ending', count(*) FILTER (WHERE info->>'status' = 'trial_ending'),
      'trial_expired', count(*) FILTER (WHERE info->>'status' = 'trial_expired'),
      'active', count(*) FILTER (WHERE info->>'status' = 'active'),
      'suspended', count(*) FILTER (WHERE info->>'status' = 'suspended'),
      'payment_pending', count(*) FILTER (WHERE info->>'financial' = 'pending'),
      'overdue', count(*) FILTER (WHERE info->>'financial' = 'overdue' OR info->>'status' = 'overdue')
    ) AS c FROM base
  ), filtered AS (
    SELECT * FROM base WHERE
      (q = '' OR lower(coalesce(full_name, '')) LIKE '%' || q || '%' OR lower(coalesce(email, '')) LIKE '%' || q || '%')
      AND (coalesce(_status, 'all') = 'all'
           OR (_status = 'with_access' AND info->>'status' IN ('active','payment_pending','free','trial','trial_ending'))
           OR (_status = 'trial_any' AND info->>'status' IN ('trial','trial_ending'))
           OR info->>'status' = _status)
      AND (coalesce(_access, 'all') = 'all' OR info->>'access_type' = _access)
      AND (coalesce(_financial, 'all') = 'all' OR info->>'financial' = _financial)
      AND (_from IS NULL OR created_at::date >= _from)
      AND (_to IS NULL OR created_at::date <= _to)
  ), page AS (
    SELECT * FROM filtered ORDER BY
      CASE WHEN _sort = 'oldest' THEN created_at END ASC,
      CASE WHEN _sort = 'last_activity' THEN (info->>'last_activity_at')::timestamptz END DESC NULLS LAST,
      CASE WHEN _sort = 'access_end' THEN (info->>'access_ends_at')::timestamptz END ASC NULLS LAST,
      CASE WHEN _sort = 'next_due' THEN (info->>'next_due_on')::date END ASC NULLS LAST,
      created_at DESC
    LIMIT lim OFFSET off
  )
  SELECT jsonb_build_object('counts', (SELECT c FROM counts), 'total', (SELECT count(*) FROM filtered), 'page_size', lim,
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(pg)) FROM page pg), '[]'::jsonb)) INTO result;
  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.admin_professional_row(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_professional_directory(uuid, text, text, text, text, date, date, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_professional_row(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_professional_directory(uuid, text, text, text, text, date, date, text, integer, integer) TO service_role;