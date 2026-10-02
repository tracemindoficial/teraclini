CREATE OR REPLACE FUNCTION public.is_account_member(_account_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am
    JOIN public.accounts a ON a.id = am.account_id
    WHERE am.account_id = _account_id
      AND am.user_id = _user_id
      AND am.status = 'active'
      AND a.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_account_role(_account_id uuid, _role public.app_role, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.account_members am
      ON am.account_id = ur.account_id AND am.user_id = ur.user_id
    JOIN public.accounts a ON a.id = ur.account_id
    WHERE ur.account_id = _account_id
      AND ur.user_id = _user_id
      AND ur.role = _role
      AND am.status = 'active'
      AND a.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT am.account_id
  FROM public.account_members am
  JOIN public.accounts a ON a.id = am.account_id
  WHERE am.user_id = auth.uid()
    AND am.status = 'active'
    AND a.status = 'active'
  ORDER BY CASE WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.account_id = am.account_id
      AND ur.user_id = am.user_id
      AND ur.role = 'owner'
  ) THEN 0 ELSE 1 END, am.created_at
  LIMIT 1
$$;

REVOKE INSERT ON public.accounts FROM authenticated;
REVOKE UPDATE ON public.accounts FROM authenticated;
GRANT UPDATE (name) ON public.accounts TO authenticated;

COMMENT ON FUNCTION public.is_account_member(uuid, uuid) IS 'Authorizes active members of active professional accounts only.';
COMMENT ON FUNCTION public.has_account_role(uuid, public.app_role, uuid) IS 'Checks a role only while both membership and professional account are active.';
COMMENT ON FUNCTION public.current_account_id() IS 'Returns the first active professional account for the signed-in active member.';