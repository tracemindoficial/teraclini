ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
      ''
    ),
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'picture'), '')
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_owned_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'guardians' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF NEW.patient_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
    IF NEW.location_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = NEW.location_id AND l.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O local informado não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'anamneses' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
    IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = NEW.appointment_id AND a.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O atendimento informado não pertence a esta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'evolutions' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = NEW.appointment_id
        AND a.user_id = NEW.user_id
        AND a.patient_id = NEW.patient_id
    ) THEN
      RAISE EXCEPTION 'O atendimento informado não pertence ao paciente desta conta.';
    END IF;
  ELSIF TG_TABLE_NAME = 'documents' THEN
    IF NEW.patient_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = NEW.patient_id AND p.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'O paciente informado não pertence a esta conta.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guardians_owned_references
BEFORE INSERT OR UPDATE ON public.guardians
FOR EACH ROW EXECUTE FUNCTION public.validate_owned_references();

CREATE TRIGGER appointments_owned_references
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_owned_references();

CREATE TRIGGER anamneses_owned_references
BEFORE INSERT OR UPDATE ON public.anamneses
FOR EACH ROW EXECUTE FUNCTION public.validate_owned_references();

CREATE TRIGGER evolutions_owned_references
BEFORE INSERT OR UPDATE ON public.evolutions
FOR EACH ROW EXECUTE FUNCTION public.validate_owned_references();

CREATE TRIGGER documents_owned_references
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.validate_owned_references();