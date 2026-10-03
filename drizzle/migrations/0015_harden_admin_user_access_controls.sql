ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_by UUID,
  ADD COLUMN IF NOT EXISTS block_reason TEXT,
  ADD COLUMN IF NOT EXISTS access_state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS access_state_changed_by UUID;

ALTER TABLE public.platform_audit_events
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS accounts_blocked_at_idx ON public.accounts(blocked_at) WHERE blocked_at IS NOT NULL;

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
      AND a.blocked_at IS NULL
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
    JOIN public.account_members am ON am.account_id = ur.account_id AND am.user_id = ur.user_id
    JOIN public.accounts a ON a.id = ur.account_id
    WHERE ur.account_id = _account_id
      AND ur.user_id = _user_id
      AND ur.role = _role
      AND am.status = 'active'
      AND a.status = 'active'
      AND a.blocked_at IS NULL
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
    AND a.blocked_at IS NULL
  ORDER BY CASE WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.account_id = am.account_id
      AND ur.user_id = am.user_id
      AND ur.role = 'owner'
  ) THEN 0 ELSE 1 END, am.created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.admin_change_account_status(
  _actor_user_id UUID,
  _account_id UUID,
  _status TEXT,
  _reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.platform_admin_role;
  actor_account_status TEXT;
  actor_account_blocked_at TIMESTAMPTZ;
  target_account public.accounts%ROWTYPE;
  normalized_reason TEXT := nullif(btrim(_reason), '');
BEGIN
  SELECT pa.role, a.status, a.blocked_at
  INTO actor_role, actor_account_status, actor_account_blocked_at
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;

  IF actor_role IS NULL OR actor_role NOT IN ('super_admin', 'support_admin')
     OR actor_account_status <> 'active' OR actor_account_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;
  IF _status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Situação inválida.'; END IF;
  IF _status = 'suspended' AND normalized_reason IS NULL THEN RAISE EXCEPTION 'Informe a justificativa.'; END IF;

  SELECT a.* INTO target_account FROM public.accounts a WHERE a.id = _account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  IF _status = 'suspended' AND target_account.owner_user_id = _actor_user_id THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta administrativa.';
  END IF;
  IF _status = 'suspended' AND EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = target_account.owner_user_id
      AND pa.role = 'super_admin'
      AND pa.revoked_at IS NULL
  ) AND (SELECT count(*) FROM public.platform_admins WHERE role = 'super_admin' AND revoked_at IS NULL) <= 1 THEN
    RAISE EXCEPTION 'O último administrador master ativo não pode ser desativado.';
  END IF;
  IF target_account.status = _status THEN RETURN FALSE; END IF;

  UPDATE public.accounts
  SET status = _status,
      access_state_changed_at = now(),
      access_state_changed_by = _actor_user_id
  WHERE id = _account_id;

  INSERT INTO public.platform_audit_events(
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
  ) VALUES (
    _actor_user_id,
    CASE WHEN _status = 'active' THEN 'account.activate' ELSE 'account.deactivate' END,
    'account', _account_id, _account_id, ARRAY['status'], 'success',
    jsonb_build_object('previous_status', target_account.status, 'new_status', _status, 'reason', normalized_reason)
  );
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_block(
  _actor_user_id UUID,
  _account_id UUID,
  _blocked BOOLEAN,
  _reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.platform_admin_role;
  actor_account_status TEXT;
  actor_account_blocked_at TIMESTAMPTZ;
  target_account public.accounts%ROWTYPE;
  normalized_reason TEXT := nullif(btrim(_reason), '');
BEGIN
  SELECT pa.role, a.status, a.blocked_at
  INTO actor_role, actor_account_status, actor_account_blocked_at
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;

  IF actor_role IS NULL OR actor_role NOT IN ('super_admin', 'support_admin')
     OR actor_account_status <> 'active' OR actor_account_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;
  IF _blocked AND normalized_reason IS NULL THEN RAISE EXCEPTION 'Informe a justificativa.'; END IF;

  SELECT a.* INTO target_account FROM public.accounts a WHERE a.id = _account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  IF _blocked AND target_account.owner_user_id = _actor_user_id THEN
    RAISE EXCEPTION 'Você não pode bloquear sua própria conta administrativa.';
  END IF;
  IF _blocked AND EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = target_account.owner_user_id
      AND pa.role = 'super_admin'
      AND pa.revoked_at IS NULL
  ) AND (SELECT count(*) FROM public.platform_admins WHERE role = 'super_admin' AND revoked_at IS NULL) <= 1 THEN
    RAISE EXCEPTION 'O último administrador master ativo não pode ser bloqueado.';
  END IF;
  IF (_blocked AND target_account.blocked_at IS NOT NULL)
     OR (NOT _blocked AND target_account.blocked_at IS NULL) THEN RETURN FALSE; END IF;

  UPDATE public.accounts
  SET blocked_at = CASE WHEN _blocked THEN now() ELSE NULL END,
      blocked_by = CASE WHEN _blocked THEN _actor_user_id ELSE NULL END,
      block_reason = CASE WHEN _blocked THEN normalized_reason ELSE NULL END,
      access_state_changed_at = now(),
      access_state_changed_by = _actor_user_id
  WHERE id = _account_id;

  INSERT INTO public.platform_audit_events(
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
  ) VALUES (
    _actor_user_id,
    CASE WHEN _blocked THEN 'account.block' ELSE 'account.unblock' END,
    'account', _account_id, _account_id,
    ARRAY['blocked_at', 'blocked_by', 'block_reason'], 'success',
    jsonb_build_object('previous_blocked', target_account.blocked_at IS NOT NULL, 'new_blocked', _blocked, 'reason', normalized_reason)
  );
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_platform_role(
  _actor_user_id UUID,
  _target_user_id UUID,
  _role public.platform_admin_role
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
BEGIN
  SELECT pa.role, a.status, a.blocked_at INTO actor_role, actor_status, actor_blocked_at
  FROM public.platform_admins pa
  JOIN public.accounts a ON a.owner_user_id = pa.user_id
  WHERE pa.user_id = _actor_user_id AND pa.revoked_at IS NULL;
  IF actor_role <> 'super_admin' OR actor_status <> 'active' OR actor_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('platform_admin_role_change'));
  SELECT * INTO current_admin FROM public.platform_admins WHERE user_id = _target_user_id FOR UPDATE;
  SELECT account_id INTO target_account_id FROM public.profiles WHERE id = _target_user_id;
  IF target_account_id IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;

  IF _role IS NULL THEN
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
    IF current_admin.id IS NOT NULL AND current_admin.role = _role AND current_admin.revoked_at IS NULL THEN RETURN FALSE; END IF;
    IF current_admin.role = 'super_admin' AND current_admin.revoked_at IS NULL AND _role <> 'super_admin'
       AND (SELECT count(*) FROM public.platform_admins WHERE role = 'super_admin' AND revoked_at IS NULL) <= 1 THEN
      RAISE EXCEPTION 'O último administrador master não pode perder esse papel.';
    END IF;
    INSERT INTO public.platform_admins(user_id, role, granted_by, revoked_at)
    VALUES (_target_user_id, _role, _actor_user_id, NULL)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by, revoked_at = NULL;
  END IF;

  INSERT INTO public.platform_audit_events(
    actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, details
  ) VALUES (
    _actor_user_id,
    CASE WHEN _role IS NULL THEN 'admin.revoke' ELSE 'admin.grant' END,
    'platform_admin', _target_user_id, target_account_id, ARRAY['role', 'revoked_at'], 'success',
    jsonb_build_object('previous_role', current_admin.role, 'new_role', _role)
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_account_status(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_account_status(UUID, UUID, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_account_block(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_block(UUID, UUID, BOOLEAN, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_platform_role(UUID, UUID, public.platform_admin_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_platform_role(UUID, UUID, public.platform_admin_role) TO service_role;

COMMENT ON COLUMN public.accounts.blocked_at IS 'Administrative security block, independent from the operational account status and subscription.';
COMMENT ON COLUMN public.accounts.block_reason IS 'Administrative reason for the current block; never stores clinical content or secrets.';
COMMENT ON COLUMN public.platform_audit_events.details IS 'Non-clinical structured context such as previous/new state and administrative reason.';