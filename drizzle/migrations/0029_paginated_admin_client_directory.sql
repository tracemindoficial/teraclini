CREATE INDEX IF NOT EXISTS admin_usage_account_time_idx ON public.usage_events(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_payments_account_updated_idx ON public.payments(account_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS admin_subscriptions_account_created_idx ON public.account_subscriptions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_profiles_name_idx ON public.profiles(lower(full_name));
CREATE INDEX IF NOT EXISTS admin_accounts_status_idx ON public.accounts(status);
CREATE OR REPLACE FUNCTION public.admin_client_directory(_actor_user_id uuid, _search text DEFAULT '', _status text DEFAULT 'all', _payment text DEFAULT 'all', _role text DEFAULT 'all', _sort text DEFAULT 'newest', _page integer DEFAULT 1, _page_size integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result jsonb; needle text := '%' || replace(replace(replace(trim(_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
 IF public.platform_admin_role_for(_actor_user_id)::text IS NULL OR public.platform_admin_role_for(_actor_user_id)::text NOT IN ('super_admin','support_admin') OR NOT EXISTS(SELECT 1 FROM public.accounts WHERE owner_user_id=_actor_user_id AND status='active' AND blocked_at IS NULL) THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 IF _page < 1 OR _page_size < 10 OR _page_size > 100 THEN RAISE EXCEPTION 'Paginação inválida.'; END IF;
 WITH directory AS MATERIALIZED (
 SELECT u.id, p.account_id, coalesce(nullif(p.full_name,''),'Cadastro incompleto') AS name, coalesce(u.email,'E-mail indisponível') AS email, p.profession,p.phone, coalesce(a.created_at,u.created_at) AS created_at, u.last_sign_in_at, coalesce(p.onboarding_completed,false) AS onboarding_completed, coalesce(a.status,'active') AS account_status,a.blocked_at,pa.role::text AS platform_role, sub.status::text AS subscription_status,sub.contracted_price_cents,sub.next_due_on,pl.name AS plan_name,pay.status::text AS payment_status, act.occurred_at AS last_activity_at
 FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id LEFT JOIN public.accounts a ON a.id=p.account_id
 LEFT JOIN public.platform_admins pa ON pa.user_id=u.id AND pa.revoked_at IS NULL
 LEFT JOIN LATERAL (SELECT s.status,s.contracted_price_cents,s.next_due_on,s.plan_id FROM public.account_subscriptions s WHERE s.account_id=a.id ORDER BY s.created_at DESC,s.id LIMIT 1) sub ON true
 LEFT JOIN public.subscription_plans pl ON pl.id=sub.plan_id
 LEFT JOIN LATERAL (SELECT status FROM public.payments WHERE account_id=a.id ORDER BY updated_at DESC,id LIMIT 1) pay ON true
 LEFT JOIN LATERAL (SELECT occurred_at FROM public.usage_events WHERE account_id=a.id ORDER BY occurred_at DESC LIMIT 1) act ON true
 WHERE (trim(_search)='' OR p.full_name ILIKE needle OR u.email ILIKE needle OR p.phone ILIKE needle OR u.id::text ILIKE needle OR a.id::text ILIKE needle)
 AND (_status='all' OR CASE WHEN _status='blocked' THEN a.blocked_at IS NOT NULL ELSE a.status=_status END)
 AND (_role='all' OR coalesce(pa.role::text,'professional')=_role)
 AND (_payment='all' OR CASE WHEN _payment='none' THEN pay.status IS NULL WHEN _payment='pending' THEN pay.status::text IN ('pending','under_review') ELSE pay.status::text=_payment END)
 ), paged AS (
 SELECT * FROM directory ORDER BY CASE WHEN _sort='name' THEN name END ASC, CASE WHEN _sort='oldest' THEN created_at END ASC, CASE WHEN _sort='last_activity' THEN last_activity_at END DESC NULLS LAST, CASE WHEN _sort='newest' THEN created_at END DESC, id
 LIMIT _page_size OFFSET ((_page::bigint-1)*_page_size)
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM directory),'page',_page,'pageSize',_page_size,'rows',coalesce((SELECT jsonb_agg(jsonb_build_object(
 'id',d.id,'accountId',d.account_id,'name',d.name,'email',d.email,'profession',d.profession,'phone',d.phone,'createdAt',d.created_at,'lastSignInAt',d.last_sign_in_at,'onboardingCompleted',d.onboarding_completed,'accountStatus',d.account_status,'accountBlocked',d.blocked_at IS NOT NULL,'platformRole',d.platform_role,'subscriptionStatus',d.subscription_status,'planName',d.plan_name,'monthlyCents',d.contracted_price_cents,'nextDueOn',d.next_due_on,'paymentStatus',d.payment_status,'lastActivityAt',d.last_activity_at,
 'lastPaymentAt',(SELECT max(confirmed_at) FROM public.payments WHERE account_id=d.account_id AND status='confirmed'),
 'specialties',coalesce((SELECT jsonb_agg(s.name ORDER BY s.name) FROM public.profile_specialties ps JOIN public.specialties s ON s.id=ps.specialty_id WHERE ps.profile_id=d.id),'[]'::jsonb)
 )) FROM paged d),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_client_directory(uuid,text,text,text,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_client_directory(uuid,text,text,text,text,text,integer,integer) TO service_role;