CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  _actor_user_id UUID,
  _target_user_id UUID,
  _full_name TEXT,
  _profession TEXT,
  _professional_registry TEXT,
  _city TEXT,
  _state TEXT,
  _care_mode public.care_mode,
  _phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.platform_admin_role;
  actor_account_status TEXT;
  target_account_id UUID;
  previous_profile public.profiles%ROWTYPE;
  changed TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT pa.role, a.status INTO actor_role, actor_account_status
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;

  IF actor_role IS NULL OR actor_role NOT IN ('super_admin', 'support_admin') OR actor_account_status <> 'active' THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;

  SELECT p.* INTO previous_profile
  FROM public.profiles p
  WHERE p.id = _target_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro não encontrado.'; END IF;
  target_account_id := previous_profile.account_id;

  IF previous_profile.full_name IS DISTINCT FROM _full_name THEN changed := array_append(changed, 'full_name'); END IF;
  IF previous_profile.profession IS DISTINCT FROM _profession THEN changed := array_append(changed, 'profession'); END IF;
  IF previous_profile.professional_registry IS DISTINCT FROM _professional_registry THEN changed := array_append(changed, 'professional_registry'); END IF;
  IF previous_profile.city IS DISTINCT FROM _city THEN changed := array_append(changed, 'city'); END IF;
  IF previous_profile.state IS DISTINCT FROM _state THEN changed := array_append(changed, 'state'); END IF;
  IF previous_profile.care_mode IS DISTINCT FROM _care_mode THEN changed := array_append(changed, 'care_mode'); END IF;
  IF previous_profile.phone IS DISTINCT FROM _phone THEN changed := array_append(changed, 'phone'); END IF;

  IF cardinality(changed) = 0 THEN RETURN FALSE; END IF;

  UPDATE public.profiles SET
    full_name = _full_name,
    profession = _profession,
    professional_registry = _professional_registry,
    city = _city,
    state = _state,
    care_mode = _care_mode,
    phone = _phone
  WHERE id = _target_user_id;

  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, 'user.profile_update', 'user', _target_user_id, target_account_id, changed, 'success');
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  _actor_user_id UUID,
  _account_id UUID,
  _status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.platform_admin_role;
  actor_account_status TEXT;
  target_account public.accounts%ROWTYPE;
BEGIN
  SELECT pa.role, a.status INTO actor_role, actor_account_status
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;

  IF actor_role IS NULL OR actor_role NOT IN ('super_admin', 'support_admin') OR actor_account_status <> 'active' THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;
  IF _status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Situação inválida.'; END IF;

  SELECT a.* INTO target_account FROM public.accounts a WHERE a.id = _account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  IF _status = 'suspended' AND target_account.owner_user_id = _actor_user_id THEN
    RAISE EXCEPTION 'Você não pode suspender sua própria conta administrativa.';
  END IF;
  IF target_account.status = _status THEN RETURN FALSE; END IF;

  UPDATE public.accounts SET status = _status WHERE id = _account_id;
  INSERT INTO public.platform_audit_events(actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result)
  VALUES (_actor_user_id, CASE WHEN _status = 'active' THEN 'account.activate' ELSE 'account.suspend' END, 'account', _account_id, _account_id, ARRAY['status'], 'success');
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.care_mode, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.care_mode, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_account_status(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(UUID, UUID, TEXT) TO service_role;