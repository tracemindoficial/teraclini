ALTER TYPE public.care_package_lifecycle ADD VALUE IF NOT EXISTS 'encerrado';

CREATE OR REPLACE FUNCTION public.close_renewed_care_package()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_package_id IS NOT NULL THEN
    UPDATE public.care_packages
    SET lifecycle_status = 'encerrado'
    WHERE id = NEW.parent_package_id
      AND account_id = NEW.account_id
      AND lifecycle_status = 'ativo';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.close_renewed_care_package() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_renewed_care_package() FROM anon;
REVOKE ALL ON FUNCTION public.close_renewed_care_package() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.close_renewed_care_package() TO service_role;
CREATE TRIGGER close_renewed_care_package_after_insert
  AFTER INSERT ON public.care_packages
  FOR EACH ROW EXECUTE FUNCTION public.close_renewed_care_package();

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
    ELSIF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status AND NEW.lifecycle_status = 'encerrado' THEN
      event_name := 'encerrado';
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
REVOKE ALL ON FUNCTION public.record_care_package_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_care_package_event() FROM anon;
REVOKE ALL ON FUNCTION public.record_care_package_event() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_care_package_event() TO service_role;

CREATE OR REPLACE FUNCTION public.validate_appointment_package()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  selected_package public.care_packages%ROWTYPE;
  used_sessions INTEGER;
BEGIN
  IF NEW.package_id IS NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'realizado' AND OLD.package_id IS NOT NULL THEN
      RAISE EXCEPTION 'Uma sessão realizada não pode ser removida do pacote.';
    END IF;
    NEW.package_session_value := NULL;
    RETURN NEW;
  END IF;

  SELECT * INTO selected_package
  FROM public.care_packages p
  WHERE p.id = NEW.package_id
    AND p.account_id = NEW.account_id
    AND p.patient_id = NEW.patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'O pacote informado não pertence a este paciente e conta.';
  END IF;

  IF selected_package.lifecycle_status <> 'ativo'
     AND (TG_OP = 'INSERT' OR OLD.package_id IS DISTINCT FROM NEW.package_id) THEN
    RAISE EXCEPTION 'O pacote informado não está ativo para este paciente.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'realizado' THEN
    IF OLD.package_id IS DISTINCT FROM NEW.package_id THEN
      RAISE EXCEPTION 'Uma sessão realizada não pode ser transferida para outro pacote.';
    END IF;
    NEW.package_session_value := OLD.package_session_value;
  ELSIF NEW.status = 'realizado' THEN
    SELECT count(*)::INTEGER INTO used_sessions
    FROM public.appointments a
    WHERE a.package_id = NEW.package_id
      AND a.status = 'realizado'
      AND (TG_OP = 'INSERT' OR a.id <> NEW.id);

    IF used_sessions >= selected_package.quantity THEN
      RAISE EXCEPTION 'Este pacote já utilizou todas as sessões contratadas.';
    END IF;

    NEW.package_session_value := selected_package.value_per_session;
  ELSE
    NEW.package_session_value := NULL;
  END IF;

  RETURN NEW;
END;
$$;