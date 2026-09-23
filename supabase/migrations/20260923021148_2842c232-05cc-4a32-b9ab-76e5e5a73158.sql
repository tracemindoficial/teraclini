DROP POLICY IF EXISTS "own locations" ON public.locations;
DROP POLICY IF EXISTS "own patients" ON public.patients;
DROP POLICY IF EXISTS "own guardians" ON public.guardians;
DROP POLICY IF EXISTS "own appointments" ON public.appointments;
DROP POLICY IF EXISTS "own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "own evolutions" ON public.evolutions;
DROP POLICY IF EXISTS "own documents" ON public.documents;
DROP POLICY IF EXISTS "own activity read" ON public.activity_log;
DROP POLICY IF EXISTS "own activity insert" ON public.activity_log;

CREATE OR REPLACE FUNCTION public.validate_owned_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_id IS NULL OR NOT public.is_account_member(NEW.account_id) THEN
    RAISE EXCEPTION 'A conta informada não está disponível para este usuário.';
  END IF;

  IF TG_TABLE_NAME = 'guardians' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF NEW.patient_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
    IF NEW.location_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = NEW.location_id AND l.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O local informado não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'anamneses' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
    IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = NEW.appointment_id AND a.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O atendimento informado não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'evolutions' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = NEW.appointment_id
        AND a.account_id = NEW.account_id
        AND a.patient_id = NEW.patient_id
    ) THEN
      RAISE EXCEPTION 'O atendimento informado não pertence ao paciente desta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'documents' THEN
    IF NEW.patient_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.account_id = NEW.account_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'O horário final deve ser depois do horário inicial.';
  END IF;
  IF NEW.status = 'cancelado' THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.account_id = NEW.account_id
      AND a.user_id = NEW.user_id
      AND a.id <> NEW.id
      AND a.status <> 'cancelado'
      AND a.starts_at < NEW.ends_at
      AND a.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Você já possui outro atendimento nesse horário.';
  END IF;

  IF NEW.patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.account_id = NEW.account_id
      AND a.patient_id = NEW.patient_id
      AND a.id <> NEW.id
      AND a.status <> 'cancelado'
      AND a.starts_at < NEW.ends_at
      AND a.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Este paciente já possui outro atendimento nesse horário.';
  END IF;

  RETURN NEW;
END;
$$;