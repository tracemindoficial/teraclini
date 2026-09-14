CREATE TYPE public.location_type AS ENUM ('consultorio_proprio','clinica','instituicao','domiciliar','online','outro');
CREATE TYPE public.age_group AS ENUM ('crianca','adolescente','adulto');
CREATE TYPE public.patient_status AS ENUM ('ativo','inativo','alta','avaliacao');
CREATE TYPE public.appointment_type AS ENUM ('atendimento_clinico','devolutiva','reuniao_responsaveis','reuniao_escolar','anamnese','outro');
CREATE TYPE public.appointment_modality AS ENUM ('presencial','online','domiciliar','outro');
CREATE TYPE public.appointment_status AS ENUM ('agendado','confirmado','realizado','falta','cancelado');
CREATE TYPE public.document_category AS ENUM ('clinico','administrativo','anexo','outro');
CREATE TYPE public.care_mode AS ENUM ('presencial','online','ambos');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  profession TEXT,
  professional_registry TEXT,
  city TEXT,
  state TEXT,
  care_mode public.care_mode,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.location_type NOT NULL DEFAULT 'clinica',
  address TEXT,
  city TEXT,
  state TEXT,
  contact TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own locations" ON public.locations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX locations_user_idx ON public.locations(user_id);
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age_group public.age_group NOT NULL DEFAULT 'adulto',
  birth_date DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  status public.patient_status NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own patients" ON public.patients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX patients_user_idx ON public.patients(user_id);
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardians TO authenticated;
GRANT ALL ON public.guardians TO service_role;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guardians" ON public.guardians FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX guardians_patient_idx ON public.guardians(patient_id);
CREATE TRIGGER guardians_updated_at BEFORE UPDATE ON public.guardians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  type public.appointment_type NOT NULL DEFAULT 'atendimento_clinico',
  modality public.appointment_modality NOT NULL DEFAULT 'presencial',
  status public.appointment_status NOT NULL DEFAULT 'agendado',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own appointments" ON public.appointments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX appointments_user_start_idx ON public.appointments(user_id, starts_at);
CREATE INDEX appointments_patient_idx ON public.appointments(patient_id);
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'O horário final deve ser depois do horário inicial.';
  END IF;
  IF NEW.status = 'cancelado' THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.user_id = NEW.user_id AND a.id <> NEW.id AND a.status <> 'cancelado'
      AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Você já possui outro atendimento nesse horário.';
  END IF;

  IF NEW.patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = NEW.patient_id AND a.id <> NEW.id AND a.status <> 'cancelado'
      AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Este paciente já possui outro atendimento nesse horário.';
  END IF;

  RETURN NEW;
END; $$;
CREATE TRIGGER appointments_conflict BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.check_appointment_conflict();

CREATE TABLE public.anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Anamnese',
  template_key TEXT NOT NULL DEFAULT 'geral',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamneses TO authenticated;
GRANT ALL ON public.anamneses TO service_role;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own anamneses" ON public.anamneses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX anamneses_patient_idx ON public.anamneses(patient_id);
CREATE TRIGGER anamneses_updated_at BEFORE UPDATE ON public.anamneses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments ON DELETE CASCADE,
  content TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolutions TO authenticated;
GRANT ALL ON public.evolutions TO service_role;
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own evolutions" ON public.evolutions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX evolutions_appointment_unique ON public.evolutions(appointment_id);
CREATE INDEX evolutions_patient_idx ON public.evolutions(patient_id);
CREATE TRIGGER evolutions_updated_at BEFORE UPDATE ON public.evolutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients ON DELETE CASCADE,
  category public.document_category NOT NULL DEFAULT 'anexo',
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX documents_patient_idx ON public.documents(patient_id);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity read" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own activity insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX activity_user_idx ON public.activity_log(user_id, created_at DESC);

CREATE POLICY "own files select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);