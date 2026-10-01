CREATE TYPE public.care_package_lifecycle AS ENUM ('ativo', 'cancelado');
CREATE TYPE public.care_package_periodicity AS ENUM ('semanal', 'quinzenal', 'mensal', 'personalizada', 'sem_periodicidade');

CREATE TABLE public.care_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_value NUMERIC(12,2) CHECK (total_value IS NULL OR total_value >= 0),
  value_per_session NUMERIC(12,2) CHECK (value_per_session IS NULL OR value_per_session >= 0),
  start_date DATE NOT NULL,
  end_date DATE,
  periodicity public.care_package_periodicity NOT NULL DEFAULT 'sem_periodicidade',
  renewal_alert_threshold INTEGER NOT NULL DEFAULT 2 CHECK (renewal_alert_threshold >= 0),
  parent_package_id UUID REFERENCES public.care_packages(id) ON DELETE RESTRICT,
  lifecycle_status public.care_package_lifecycle NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (renewal_alert_threshold <= quantity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_packages TO authenticated;
GRANT ALL ON public.care_packages TO service_role;
ALTER TABLE public.care_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage care packages" ON public.care_packages FOR ALL TO authenticated
  USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));

CREATE TABLE public.care_package_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  package_id UUID NOT NULL REFERENCES public.care_packages(id) ON DELETE CASCADE,
  actor_user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('criado', 'alterado', 'renovado', 'cancelado', 'encerrado')),
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  related_package_id UUID REFERENCES public.care_packages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.care_package_events TO authenticated;
GRANT ALL ON public.care_package_events TO service_role;
ALTER TABLE public.care_package_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members read care package events" ON public.care_package_events FOR SELECT TO authenticated
  USING (public.is_account_member(account_id));

ALTER TABLE public.appointments
  ADD COLUMN package_id UUID REFERENCES public.care_packages(id) ON DELETE SET NULL,
  ADD COLUMN package_session_value NUMERIC(12,2) CHECK (package_session_value IS NULL OR package_session_value >= 0);

CREATE INDEX care_packages_account_patient_idx ON public.care_packages(account_id, patient_id, start_date DESC);
CREATE INDEX care_packages_attention_idx ON public.care_packages(account_id, lifecycle_status, start_date DESC);
CREATE INDEX care_package_events_package_idx ON public.care_package_events(package_id, created_at DESC);
CREATE INDEX appointments_package_idx ON public.appointments(package_id, starts_at);
CREATE UNIQUE INDEX care_packages_one_renewal_idx ON public.care_packages(parent_package_id) WHERE parent_package_id IS NOT NULL;

CREATE TRIGGER care_packages_updated_at BEFORE UPDATE ON public.care_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_care_package()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  used_sessions INTEGER;
BEGIN
  IF NEW.account_id IS NULL OR NOT public.is_account_member(NEW.account_id) THEN
    RAISE EXCEPTION 'A conta informada não está disponível para este usuário.';
  END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'O profissional informado não corresponde à sessão atual.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.patients p WHERE p.id = NEW.patient_id AND p.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
  END IF;
  IF NEW.appointment_type_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appointment_types t WHERE t.id = NEW.appointment_type_id AND t.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'O serviço informado não pertence a esta conta.';
  END IF;
  IF NEW.parent_package_id IS NOT NULL THEN
    IF NEW.parent_package_id = NEW.id OR NOT EXISTS (
      SELECT 1 FROM public.care_packages p
      WHERE p.id = NEW.parent_package_id AND p.account_id = NEW.account_id AND p.patient_id = NEW.patient_id
    ) THEN
      RAISE EXCEPTION 'O pacote anterior não pertence ao mesmo paciente desta conta.';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.quantity < OLD.quantity THEN
    SELECT count(*)::INTEGER INTO used_sessions
    FROM public.appointments a
    WHERE a.package_id = NEW.id AND a.status = 'realizado';
    IF NEW.quantity < used_sessions THEN
      RAISE EXCEPTION 'Não é possível reduzir o pacote para uma quantidade inferior ao número de sessões já utilizadas.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_care_package_before_write BEFORE INSERT OR UPDATE ON public.care_packages
  FOR EACH ROW EXECUTE FUNCTION public.validate_care_package();

CREATE OR REPLACE FUNCTION public.validate_appointment_package()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.package_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.care_packages p
    WHERE p.id = NEW.package_id
      AND p.account_id = NEW.account_id
      AND p.patient_id = NEW.patient_id
      AND p.lifecycle_status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'O pacote informado não está ativo para este paciente.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_appointment_package_before_write BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_package();

CREATE OR REPLACE FUNCTION public.record_care_package_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_name TEXT;
  fields TEXT[] := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_name := CASE WHEN NEW.parent_package_id IS NULL THEN 'criado' ELSE 'renovado' END;
    fields := ARRAY['quantity', 'start_date', 'lifecycle_status'];
  ELSE
    IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status AND NEW.lifecycle_status = 'cancelado' THEN
      event_name := 'cancelado';
    ELSE
      event_name := 'alterado';
    END IF;
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN fields := array_append(fields, 'quantity'); END IF;
    IF OLD.total_value IS DISTINCT FROM NEW.total_value THEN fields := array_append(fields, 'total_value'); END IF;
    IF OLD.value_per_session IS DISTINCT FROM NEW.value_per_session THEN fields := array_append(fields, 'value_per_session'); END IF;
    IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN fields := array_append(fields, 'start_date'); END IF;
    IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN fields := array_append(fields, 'end_date'); END IF;
    IF OLD.periodicity IS DISTINCT FROM NEW.periodicity THEN fields := array_append(fields, 'periodicity'); END IF;
    IF OLD.renewal_alert_threshold IS DISTINCT FROM NEW.renewal_alert_threshold THEN fields := array_append(fields, 'renewal_alert_threshold'); END IF;
    IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN fields := array_append(fields, 'lifecycle_status'); END IF;
  END IF;
  INSERT INTO public.care_package_events(account_id, package_id, actor_user_id, event_type, changed_fields, related_package_id)
  VALUES (NEW.account_id, NEW.id, auth.uid(), event_name, fields, NEW.parent_package_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER care_package_event_history AFTER INSERT OR UPDATE ON public.care_packages
  FOR EACH ROW EXECUTE FUNCTION public.record_care_package_event();

CREATE TRIGGER audit_care_packages AFTER INSERT OR UPDATE OR DELETE ON public.care_packages
  FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();