CREATE TABLE public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT specialties_name_not_blank CHECK (char_length(btrim(name)) >= 2)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage specialties" ON public.specialties FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE UNIQUE INDEX specialties_account_normalized_name_key ON public.specialties (account_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
CREATE INDEX specialties_account_active_idx ON public.specialties (account_id, name) WHERE is_active;
CREATE TRIGGER specialties_set_updated_at BEFORE UPDATE ON public.specialties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER specialties_safe_audit AFTER INSERT OR UPDATE OR DELETE ON public.specialties FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();

CREATE TABLE public.profile_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, specialty_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_specialties TO authenticated;
GRANT ALL ON public.profile_specialties TO service_role;
ALTER TABLE public.profile_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage profile specialties" ON public.profile_specialties FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE UNIQUE INDEX profile_specialties_one_primary_idx ON public.profile_specialties (profile_id) WHERE is_primary;
CREATE INDEX profile_specialties_account_idx ON public.profile_specialties (account_id, profile_id);
CREATE TRIGGER profile_specialties_safe_audit AFTER INSERT OR UPDATE OR DELETE ON public.profile_specialties FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();

ALTER TABLE public.appointment_types ADD COLUMN description TEXT;
ALTER TABLE public.appointment_types ADD COLUMN category TEXT NOT NULL DEFAULT 'atendimento';
ALTER TABLE public.appointment_types ADD CONSTRAINT appointment_types_category_check CHECK (category IN ('atendimento','avaliacao','reuniao','devolutiva','outro'));
ALTER TABLE public.appointment_types ADD CONSTRAINT appointment_types_duration_check CHECK (default_duration_minutes BETWEEN 5 AND 720) NOT VALID;
CREATE UNIQUE INDEX appointment_types_account_normalized_name_key ON public.appointment_types (account_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

CREATE TABLE public.service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  appointment_type_id UUID NOT NULL REFERENCES public.appointment_types(id) ON DELETE RESTRICT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
  modality TEXT NOT NULL CHECK (modality IN ('presencial','online','hibrido','todas')),
  billing_type TEXT NOT NULL CHECK (billing_type IN ('avulso','pacote')),
  package_quantity INTEGER CHECK ((billing_type = 'pacote' AND package_quantity >= 1) OR (billing_type = 'avulso' AND package_quantity IS NULL)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  parent_price_id UUID REFERENCES public.service_prices(id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_prices TO authenticated;
GRANT ALL ON public.service_prices TO service_role;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage service prices" ON public.service_prices FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE INDEX service_prices_account_service_idx ON public.service_prices (account_id, appointment_type_id, is_active);
CREATE INDEX service_prices_active_idx ON public.service_prices (account_id, appointment_type_id, modality, billing_type) WHERE is_active;
CREATE TRIGGER service_prices_set_updated_at BEFORE UPDATE ON public.service_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER service_prices_safe_audit AFTER INSERT OR UPDATE OR DELETE ON public.service_prices FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();

ALTER TABLE public.appointments ADD COLUMN service_price_id UUID REFERENCES public.service_prices(id) ON DELETE RESTRICT;
ALTER TABLE public.appointments ADD COLUMN service_name_snapshot TEXT;
ALTER TABLE public.appointments ADD COLUMN price_cents_snapshot INTEGER;
ALTER TABLE public.appointments ADD COLUMN duration_minutes_snapshot INTEGER;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_price_snapshot_check CHECK (price_cents_snapshot IS NULL OR price_cents_snapshot >= 0) NOT VALID;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_duration_snapshot_check CHECK (duration_minutes_snapshot IS NULL OR duration_minutes_snapshot BETWEEN 5 AND 720) NOT VALID;

ALTER TABLE public.care_packages ADD COLUMN service_price_id UUID REFERENCES public.service_prices(id) ON DELETE RESTRICT;
ALTER TABLE public.care_packages ADD COLUMN total_value_cents INTEGER;
ALTER TABLE public.care_packages ADD COLUMN value_per_session_cents INTEGER;
ALTER TABLE public.care_packages ADD CONSTRAINT care_packages_total_cents_check CHECK (total_value_cents IS NULL OR total_value_cents >= 0) NOT VALID;
ALTER TABLE public.care_packages ADD CONSTRAINT care_packages_session_cents_check CHECK (value_per_session_cents IS NULL OR value_per_session_cents >= 0) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_basic_registration_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_account UUID;
BEGIN
  IF TG_TABLE_NAME = 'profile_specialties' THEN
    SELECT account_id INTO target_account FROM public.profiles WHERE id = NEW.profile_id;
    IF target_account IS DISTINCT FROM NEW.account_id OR NOT EXISTS (SELECT 1 FROM public.specialties WHERE id = NEW.specialty_id AND account_id = NEW.account_id) THEN
      RAISE EXCEPTION 'Especialidade não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'service_prices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.appointment_types WHERE id = NEW.appointment_type_id AND account_id = NEW.account_id) THEN
      RAISE EXCEPTION 'Serviço não pertence a esta conta.';
    END IF;
    IF NEW.parent_price_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.service_prices WHERE id = NEW.parent_price_id AND account_id = NEW.account_id) THEN
      RAISE EXCEPTION 'Valor anterior não pertence a esta conta.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_profile_specialty_references BEFORE INSERT OR UPDATE ON public.profile_specialties FOR EACH ROW EXECUTE FUNCTION public.validate_basic_registration_references();
CREATE TRIGGER validate_service_price_references BEFORE INSERT OR UPDATE ON public.service_prices FOR EACH ROW EXECUTE FUNCTION public.validate_basic_registration_references();

CREATE OR REPLACE FUNCTION public.snapshot_appointment_service_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  selected_price public.service_prices%ROWTYPE;
  selected_service public.appointment_types%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'realizado' AND (
    NEW.appointment_type_id IS DISTINCT FROM OLD.appointment_type_id OR
    NEW.service_price_id IS DISTINCT FROM OLD.service_price_id OR
    NEW.service_name_snapshot IS DISTINCT FROM OLD.service_name_snapshot OR
    NEW.price_cents_snapshot IS DISTINCT FROM OLD.price_cents_snapshot OR
    NEW.duration_minutes_snapshot IS DISTINCT FROM OLD.duration_minutes_snapshot
  ) THEN
    RAISE EXCEPTION 'O serviço e o valor de um atendimento realizado não podem ser alterados.';
  END IF;

  IF NEW.service_price_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.service_price_id IS DISTINCT FROM OLD.service_price_id) THEN
    SELECT * INTO selected_price FROM public.service_prices WHERE id = NEW.service_price_id AND account_id = NEW.account_id;
    IF selected_price.id IS NULL OR selected_price.billing_type <> 'avulso' THEN RAISE EXCEPTION 'Valor avulso inválido para esta conta.'; END IF;
    NEW.appointment_type_id := selected_price.appointment_type_id;
    NEW.price_cents_snapshot := selected_price.price_cents;
    NEW.duration_minutes_snapshot := selected_price.duration_minutes;
  END IF;

  IF NEW.appointment_type_id IS NOT NULL AND (NEW.service_name_snapshot IS NULL OR TG_OP = 'INSERT') THEN
    SELECT * INTO selected_service FROM public.appointment_types WHERE id = NEW.appointment_type_id AND account_id = NEW.account_id;
    IF selected_service.id IS NULL THEN RAISE EXCEPTION 'Serviço inválido para esta conta.'; END IF;
    NEW.service_name_snapshot := selected_service.name;
    NEW.duration_minutes_snapshot := COALESCE(NEW.duration_minutes_snapshot, selected_service.default_duration_minutes);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER snapshot_appointment_service_price BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.snapshot_appointment_service_price();

CREATE OR REPLACE FUNCTION public.snapshot_care_package_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE selected_price public.service_prices%ROWTYPE;
BEGIN
  IF NEW.service_price_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.service_price_id IS DISTINCT FROM OLD.service_price_id) THEN
    SELECT * INTO selected_price FROM public.service_prices WHERE id = NEW.service_price_id AND account_id = NEW.account_id;
    IF selected_price.id IS NULL OR selected_price.billing_type <> 'pacote' THEN RAISE EXCEPTION 'Valor de pacote inválido para esta conta.'; END IF;
    NEW.appointment_type_id := selected_price.appointment_type_id;
    NEW.quantity := selected_price.package_quantity;
    NEW.total_value_cents := selected_price.price_cents;
    NEW.value_per_session_cents := ROUND(selected_price.price_cents::numeric / selected_price.package_quantity)::integer;
    NEW.total_value := selected_price.price_cents::numeric / 100;
    NEW.value_per_session := ROUND((selected_price.price_cents::numeric / selected_price.package_quantity) / 100, 2);
  ELSIF NEW.total_value_cents IS NOT NULL THEN
    NEW.total_value := NEW.total_value_cents::numeric / 100;
    NEW.value_per_session_cents := ROUND(NEW.total_value_cents::numeric / NEW.quantity)::integer;
    NEW.value_per_session := ROUND((NEW.total_value_cents::numeric / NEW.quantity) / 100, 2);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER snapshot_care_package_price BEFORE INSERT OR UPDATE ON public.care_packages FOR EACH ROW EXECUTE FUNCTION public.snapshot_care_package_price();

CREATE OR REPLACE FUNCTION public.seed_basic_registrations(target_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.specialties (account_id, name)
  SELECT target_account_id, seed.name FROM (VALUES
    ('Psicologia'),('Psicanálise'),('Neuropsicopedagogia'),('Psicopedagogia'),('Terapia'),('Neuropsicologia'),('Psiquiatria'),('Avaliação Psicológica'),('Orientação Profissional'),('Terapia Ocupacional'),('Fonoaudiologia'),('Nutrição'),('Serviço Social'),('Outra')
  ) AS seed(name)
  WHERE NOT EXISTS (SELECT 1 FROM public.specialties s WHERE s.account_id = target_account_id AND lower(regexp_replace(btrim(s.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(seed.name), '\s+', ' ', 'g')));

  INSERT INTO public.appointment_types (account_id, name, default_duration_minutes, category)
  SELECT target_account_id, seed.name, seed.duration, seed.category FROM (VALUES
    ('Atendimento Clínico',50,'atendimento'),('Avaliação',90,'avaliacao'),('Devolutiva',50,'devolutiva'),('Reunião Externa',60,'reuniao'),('Entrevista Inicial',60,'avaliacao'),('Orientação',50,'atendimento'),('Supervisão',60,'atendimento'),('Acompanhamento',50,'atendimento'),('Reunião com Responsável',60,'reuniao'),('Reunião Escolar',60,'reuniao'),('Outro',60,'outro')
  ) AS seed(name,duration,category)
  WHERE NOT EXISTS (SELECT 1 FROM public.appointment_types a WHERE a.account_id = target_account_id AND lower(regexp_replace(btrim(a.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(seed.name), '\s+', ' ', 'g')));
END;
$$;
REVOKE ALL ON FUNCTION public.seed_basic_registrations(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_basic_registrations(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.seed_basic_registrations_for_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN PERFORM public.seed_basic_registrations(NEW.id); RETURN NEW; END; $$;
CREATE TRIGGER seed_basic_registrations_after_account AFTER INSERT ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.seed_basic_registrations_for_account();

CREATE OR REPLACE FUNCTION public.sync_primary_specialty_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.profiles p SET profession = s.name
    FROM public.specialties s
    WHERE p.id = NEW.profile_id AND s.id = NEW.specialty_id AND p.account_id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_primary_specialty_to_profile_after_write AFTER INSERT OR UPDATE ON public.profile_specialties FOR EACH ROW EXECUTE FUNCTION public.sync_primary_specialty_to_profile();

COMMENT ON TABLE public.specialties IS 'Account-scoped reusable professional specialties; deactivate instead of deleting used rows.';
COMMENT ON TABLE public.profile_specialties IS 'Many-to-many relationship between professional profiles and account specialties.';
COMMENT ON TABLE public.service_prices IS 'Versioned account-scoped price offers in integer Brazilian real cents.';
COMMENT ON COLUMN public.profiles.profession IS 'Legacy compatibility display value synchronized from the primary profile specialty.';
COMMENT ON COLUMN public.appointments.type IS 'Legacy compatibility classification; appointment_type_id is the primary service reference for new records.';