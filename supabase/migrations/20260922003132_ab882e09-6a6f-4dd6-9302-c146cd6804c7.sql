CREATE TYPE public.app_role AS ENUM ('owner', 'assistant', 'finance');

CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Meu espaço profissional',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);
GRANT SELECT ON public.account_members TO authenticated;
GRANT ALL ON public.account_members TO service_role;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_account_member(_account_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
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
SECURITY DEFINER
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
SECURITY DEFINER
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

CREATE POLICY "members can read accounts" ON public.accounts
FOR SELECT TO authenticated USING (public.is_account_member(id));
CREATE POLICY "owners can update accounts" ON public.accounts
FOR UPDATE TO authenticated USING (public.has_account_role(id, 'owner'))
WITH CHECK (public.has_account_role(id, 'owner'));
CREATE POLICY "members can read account membership" ON public.account_members
FOR SELECT TO authenticated USING (public.is_account_member(account_id));
CREATE POLICY "members can read account roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_account_member(account_id));

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER account_members_updated_at BEFORE UPDATE ON public.account_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.accounts (owner_user_id, name)
SELECT p.id, COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Meu espaço profissional')
FROM public.profiles p
ON CONFLICT (owner_user_id) DO NOTHING;

INSERT INTO public.account_members (account_id, user_id, status)
SELECT a.id, a.owner_user_id, 'active'
FROM public.accounts a
ON CONFLICT (account_id, user_id) DO NOTHING;

INSERT INTO public.user_roles (account_id, user_id, role)
SELECT a.id, a.owner_user_id, 'owner'::public.app_role
FROM public.accounts a
ON CONFLICT (account_id, user_id, role) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.locations ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.patients ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.guardians ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.appointments ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.anamneses ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.evolutions ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.documents ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.activity_log ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;

UPDATE public.profiles t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.id;
UPDATE public.locations t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.patients t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.guardians t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.appointments t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.anamneses t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.evolutions t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.documents t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;
UPDATE public.activity_log t SET account_id = a.id FROM public.accounts a WHERE a.owner_user_id = t.user_id;

ALTER TABLE public.profiles ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.locations ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.patients ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.guardians ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.appointments ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.anamneses ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.evolutions ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.documents ALTER COLUMN account_id SET DEFAULT public.current_account_id();
ALTER TABLE public.activity_log ALTER COLUMN account_id SET DEFAULT public.current_account_id();

ALTER TABLE public.profiles ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.locations ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.patients ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.guardians ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.anamneses ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.evolutions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.documents ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.activity_log ALTER COLUMN account_id SET NOT NULL;

CREATE INDEX profiles_account_idx ON public.profiles(account_id);
CREATE INDEX locations_account_idx ON public.locations(account_id);
CREATE INDEX patients_account_idx ON public.patients(account_id);
CREATE INDEX guardians_account_idx ON public.guardians(account_id);
CREATE INDEX appointments_account_start_idx ON public.appointments(account_id, starts_at);
CREATE INDEX anamneses_account_idx ON public.anamneses(account_id);
CREATE INDEX evolutions_account_idx ON public.evolutions(account_id);
CREATE INDEX documents_account_idx ON public.documents(account_id);
CREATE INDEX activity_log_account_idx ON public.activity_log(account_id, created_at DESC);
CREATE INDEX account_members_user_idx ON public.account_members(user_id, status);
CREATE INDEX user_roles_user_idx ON public.user_roles(user_id, account_id);

CREATE POLICY "account members manage locations" ON public.locations
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members manage patients" ON public.patients
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members manage guardians" ON public.guardians
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members manage appointments" ON public.appointments
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members manage anamneses" ON public.anamneses
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members manage evolutions" ON public.evolutions
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members manage documents" ON public.documents
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "account members read activity" ON public.activity_log
FOR SELECT TO authenticated USING (public.is_account_member(account_id));
CREATE POLICY "account members create activity" ON public.activity_log
FOR INSERT TO authenticated WITH CHECK (public.is_account_member(account_id));

CREATE TABLE public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL CHECK (task_key IN ('profile', 'location', 'room', 'availability', 'patient', 'appointment')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, task_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_tasks TO authenticated;
GRANT ALL ON public.onboarding_tasks TO service_role;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage onboarding tasks" ON public.onboarding_tasks
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE INDEX onboarding_tasks_account_idx ON public.onboarding_tasks(account_id);
CREATE TRIGGER onboarding_tasks_updated_at BEFORE UPDATE ON public.onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.onboarding_tasks (account_id, task_key, completed_at)
SELECT a.id, task.task_key,
  CASE
    WHEN task.task_key = 'profile' AND p.onboarding_completed THEN COALESCE(p.updated_at, now())
    WHEN task.task_key = 'location' AND EXISTS (SELECT 1 FROM public.locations l WHERE l.account_id = a.id) THEN now()
    WHEN task.task_key = 'patient' AND EXISTS (SELECT 1 FROM public.patients pt WHERE pt.account_id = a.id) THEN now()
    WHEN task.task_key = 'appointment' AND EXISTS (SELECT 1 FROM public.appointments ap WHERE ap.account_id = a.id) THEN now()
    ELSE NULL
  END
FROM public.accounts a
JOIN public.profiles p ON p.account_id = a.id
CROSS JOIN (VALUES ('profile'), ('location'), ('room'), ('availability'), ('patient'), ('appointment')) AS task(task_key)
ON CONFLICT (account_id, task_key) DO NOTHING;

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  actor_user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'deleted')),
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members read audit events" ON public.audit_events
FOR SELECT TO authenticated USING (public.is_account_member(account_id));
CREATE INDEX audit_events_account_created_idx ON public.audit_events(account_id, created_at DESC);
CREATE INDEX audit_events_entity_idx ON public.audit_events(entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.record_safe_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id UUID;
  row_account_id UUID;
  fields TEXT[] := '{}';
  event_action TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_id := OLD.id;
    row_account_id := OLD.account_id;
    event_action := 'deleted';
  ELSE
    row_id := NEW.id;
    row_account_id := NEW.account_id;
    event_action := CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(array_agg(key ORDER BY key), '{}') INTO fields
    FROM jsonb_each(to_jsonb(NEW)) n
    WHERE key NOT IN ('content', 'notes', 'storage_path', 'cpf', 'phone', 'email', 'address')
      AND to_jsonb(OLD) -> key IS DISTINCT FROM n.value;
  END IF;

  INSERT INTO public.audit_events (account_id, actor_user_id, entity_type, entity_id, action, changed_fields)
  VALUES (row_account_id, auth.uid(), TG_TABLE_NAME, row_id, event_action, fields);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_anamneses AFTER INSERT OR UPDATE OR DELETE ON public.anamneses
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_evolutions AFTER INSERT OR UPDATE OR DELETE ON public.evolutions
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id UUID;
  profile_name TEXT;
  profile_avatar TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    ''
  );
  profile_avatar := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'picture'), '')
  );

  INSERT INTO public.accounts (owner_user_id, name)
  VALUES (NEW.id, COALESCE(NULLIF(profile_name, ''), 'Meu espaço profissional'))
  RETURNING id INTO new_account_id;

  INSERT INTO public.account_members (account_id, user_id, status)
  VALUES (new_account_id, NEW.id, 'active');

  INSERT INTO public.user_roles (account_id, user_id, role)
  VALUES (new_account_id, NEW.id, 'owner');

  INSERT INTO public.profiles (id, account_id, full_name, avatar_url)
  VALUES (NEW.id, new_account_id, profile_name, profile_avatar)
  ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id;

  INSERT INTO public.onboarding_tasks (account_id, task_key)
  SELECT new_account_id, task_key
  FROM unnest(ARRAY['profile', 'location', 'room', 'availability', 'patient', 'appointment']) AS task_key;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_account_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_account_role(UUID, public.app_role, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;