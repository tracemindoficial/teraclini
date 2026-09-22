DROP POLICY "members can read account membership" ON public.account_members;
DROP POLICY "members can read account roles" ON public.user_roles;
CREATE POLICY "users read own account membership" ON public.account_members
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users read own account roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_account_member(_account_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_id = _account_id
      AND user_id = _user_id
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_account_role(_account_id UUID, _role public.app_role, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.account_members am
      ON am.account_id = ur.account_id AND am.user_id = ur.user_id
    WHERE ur.account_id = _account_id
      AND ur.user_id = _user_id
      AND ur.role = _role
      AND am.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT am.account_id
  FROM public.account_members am
  WHERE am.user_id = auth.uid() AND am.status = 'active'
  ORDER BY CASE WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.account_id = am.account_id AND ur.user_id = am.user_id AND ur.role = 'owner'
  ) THEN 0 ELSE 1 END, am.created_at
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_safe_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_account_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_account_role(UUID, public.app_role, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_account_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_account_role(UUID, public.app_role, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;