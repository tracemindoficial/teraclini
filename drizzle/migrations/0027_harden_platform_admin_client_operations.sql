CREATE OR REPLACE FUNCTION public.platform_admin_role_for(_user_id UUID)
RETURNS public.platform_admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.role
  FROM public.platform_admins pa
  WHERE pa.user_id = _user_id
    AND pa.revoked_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.platform_admin_role_for(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_role_for(UUID) TO service_role;

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
  current_admin public.platform_admins%ROWTYPE;
  target_account_id UUID;
  parsed_role public.platform_admin_role;
BEGIN
  actor_role := public.platform_admin_role_for(_actor_user_id);
  IF actor_role IS NULL OR actor_role <> 'super_admin' THEN
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
  target_account_id UUID;
  changed BOOLEAN;
  previous_profile JSONB;
  updated_profile JSONB;
BEGIN
  actor_role := public.platform_admin_role_for(_actor_user_id);
  IF actor_role IS NULL OR actor_role NOT IN ('super_admin', 'support_admin') THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;
  IF length(btrim(_full_name)) < 2 THEN RAISE EXCEPTION 'Informe um nome válido.'; END IF;

  SELECT account_id,
         jsonb_build_object(
           'full_name', full_name,
           'profession', profession,
           'professional_registry', professional_registry,
           'city', city,
           'state', state,
           'care_mode', care_mode,
           'phone', phone
         )
    INTO target_account_id, previous_profile
  FROM public.profiles
  WHERE id = _target_user_id
  FOR UPDATE;
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
    SELECT jsonb_build_object(
             'full_name', full_name,
             'profession', profession,
             'professional_registry', professional_registry,
             'city', city,
             'state', state,
             'care_mode', care_mode,
             'phone', phone
           )
      INTO updated_profile
    FROM public.profiles
    WHERE id = _target_user_id;

    INSERT INTO public.platform_audit_events(
      actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
    ) VALUES (
      _actor_user_id, 'user.profile_update', 'user', _target_user_id, target_account_id,
      ARRAY['full_name','profession','professional_registry','city','state','care_mode','phone'],
      'success', jsonb_build_object('previous', previous_profile, 'new', updated_profile)
    );
  END IF;
  RETURN changed;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.care_mode, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.care_mode, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_record_email_change(
  _actor_user_id UUID,
  _target_user_id UUID,
  _previous_email_domain TEXT,
  _new_email_domain TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.platform_admin_role;
  target_account_id UUID;
BEGIN
  actor_role := public.platform_admin_role_for(_actor_user_id);
  IF actor_role IS NULL OR actor_role NOT IN ('super_admin', 'support_admin') THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;

  SELECT account_id INTO target_account_id
  FROM public.profiles
  WHERE id = _target_user_id;
  IF target_account_id IS NULL THEN RAISE EXCEPTION 'Perfil não encontrado.'; END IF;

  INSERT INTO public.account_access_events(
    account_id, user_id, actor_user_id, event_type, details
  ) VALUES (
    target_account_id, _target_user_id, _actor_user_id, 'email_changed',
    jsonb_build_object('previous_email_domain', _previous_email_domain, 'new_email_domain', _new_email_domain)
  );

  INSERT INTO public.platform_audit_events(
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
  ) VALUES (
    _actor_user_id, 'user.email_change', 'user', _target_user_id, target_account_id,
    ARRAY['email'], 'success',
    jsonb_build_object('previous_email_domain', _previous_email_domain, 'new_email_domain', _new_email_domain)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_email_change(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_email_change(UUID, UUID, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.admin_set_account_status(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_platform_role(UUID, UUID, public.platform_admin_role) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.admin_set_account_status(UUID, UUID, TEXT) IS 'DEPRECATED: replaced by admin_change_account_status with reason and lockout protections.';
COMMENT ON FUNCTION public.admin_set_platform_role(UUID, UUID, public.platform_admin_role) IS 'DEPRECATED: replaced by admin_set_platform_role_v2 with explicit validation.';