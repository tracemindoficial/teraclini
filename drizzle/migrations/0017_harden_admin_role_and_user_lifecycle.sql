CREATE OR REPLACE FUNCTION public.admin_set_platform_role_v2(
  _actor_user_id UUID,
  _target_user_id UUID,
  _role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.platform_admin_role;
  actor_status TEXT;
  actor_blocked_at TIMESTAMPTZ;
  current_admin public.platform_admins%ROWTYPE;
  target_account_id UUID;
  parsed_role public.platform_admin_role;
BEGIN
  SELECT pa.role, a.status, a.blocked_at INTO actor_role, actor_status, actor_blocked_at
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;

  IF actor_role <> 'super_admin' OR actor_status <> 'active' OR actor_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;

  IF _role IS NOT NULL AND _role NOT IN ('super_admin', 'support_admin', 'analyst', 'finance_admin', 'content_admin') THEN
    RAISE EXCEPTION 'Papel administrativo inválido.';
  END IF;
  parsed_role := _role::public.platform_admin_role;

  PERFORM pg_advisory_xact_lock(hashtext('platform_admin_role_change'));
  SELECT * INTO current_admin FROM public.platform_admins WHERE user_id = _target_user_id FOR UPDATE;
  SELECT account_id INTO target_account_id FROM public.profiles WHERE id = _target_user_id;
  IF target_account_id IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;

  IF parsed_role IS NULL THEN
    IF _target_user_id = _actor_user_id THEN
      RAISE EXCEPTION 'Transfira a administração antes de remover seu próprio acesso.';
    END IF;
    IF current_admin.role = 'super_admin' AND current_admin.revoked_at IS NULL
       AND (SELECT count(*) FROM public.platform_admins WHERE role = 'super_admin' AND revoked_at IS NULL) <= 1 THEN
      RAISE EXCEPTION 'O último administrador master não pode ser removido.';
    END IF;
    IF current_admin.id IS NULL OR current_admin.revoked_at IS NOT NULL THEN RETURN FALSE; END IF;
    UPDATE public.platform_admins SET revoked_at = now() WHERE id = current_admin.id;
  ELSE
    IF current_admin.id IS NOT NULL AND current_admin.role = parsed_role AND current_admin.revoked_at IS NULL THEN RETURN FALSE; END IF;
    IF current_admin.role = 'super_admin' AND current_admin.revoked_at IS NULL AND parsed_role <> 'super_admin'
       AND (SELECT count(*) FROM public.platform_admins WHERE role = 'super_admin' AND revoked_at IS NULL) <= 1 THEN
      RAISE EXCEPTION 'O último administrador master não pode perder esse papel.';
    END IF;
    INSERT INTO public.platform_admins(user_id, role, granted_by, revoked_at)
    VALUES (_target_user_id, parsed_role, _actor_user_id, NULL)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by, revoked_at = NULL;
  END IF;

  INSERT INTO public.platform_audit_events(
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
  ) VALUES (
    _actor_user_id,
    CASE WHEN parsed_role IS NULL THEN 'admin.revoke' ELSE 'admin.grant' END,
    'platform_admin', _target_user_id, target_account_id, ARRAY['role', 'revoked_at'], 'success',
    jsonb_build_object('previous_role', current_admin.role, 'new_role', parsed_role)
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_platform_role_v2(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_platform_role_v2(UUID, UUID, TEXT) TO service_role;

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
  actor_status TEXT;
  actor_blocked_at TIMESTAMPTZ;
  target_account_id UUID;
  changed BOOLEAN;
BEGIN
  SELECT pa.role, a.status, a.blocked_at INTO actor_role, actor_status, actor_blocked_at
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;
  IF actor_role NOT IN ('super_admin', 'support_admin') OR actor_status <> 'active' OR actor_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;
  IF length(btrim(_full_name)) < 2 THEN RAISE EXCEPTION 'Informe um nome válido.'; END IF;

  SELECT account_id INTO target_account_id FROM public.profiles WHERE id = _target_user_id FOR UPDATE;
  IF target_account_id IS NULL THEN RAISE EXCEPTION 'Perfil não encontrado.'; END IF;

  UPDATE public.profiles
  SET full_name = btrim(_full_name),
      profession = nullif(btrim(_profession), ''),
      professional_registry = nullif(btrim(_professional_registry), ''),
      city = nullif(btrim(_city), ''),
      state = nullif(btrim(_state), ''),
      care_mode = _care_mode,
      phone = nullif(btrim(_phone), '')
  WHERE id = _target_user_id
    AND (full_name, profession, professional_registry, city, state, care_mode, phone)
      IS DISTINCT FROM
      (btrim(_full_name), nullif(btrim(_profession), ''), nullif(btrim(_professional_registry), ''), nullif(btrim(_city), ''), nullif(btrim(_state), ''), _care_mode, nullif(btrim(_phone), ''));
  changed := FOUND;

  IF changed THEN
    INSERT INTO public.platform_audit_events(
      actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
    ) VALUES (
      _actor_user_id, 'user.profile_update', 'user', _target_user_id, target_account_id,
      ARRAY['full_name','profession','professional_registry','city','state','care_mode','phone'],
      'success', '{}'::jsonb
    );
  END IF;
  RETURN changed;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.care_mode, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.care_mode, TEXT) TO service_role;