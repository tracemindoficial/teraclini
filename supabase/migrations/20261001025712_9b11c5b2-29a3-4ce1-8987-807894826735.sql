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
     AND (TG_OP = 'INSERT' OR OLD.package_id IS DISTINCT FROM NEW.package_id OR OLD.status IS DISTINCT FROM NEW.status) THEN
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