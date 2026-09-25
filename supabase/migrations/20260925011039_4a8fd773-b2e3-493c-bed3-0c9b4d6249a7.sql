CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'em_andamento' BEFORE 'realizado';

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE INDEX rooms_account_location_idx ON public.rooms(account_id, location_id);
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  modality public.appointment_modality,
  valid_from DATE,
  valid_until DATE,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT ALL ON public.availability_rules TO service_role;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage availability" ON public.availability_rules FOR ALL TO authenticated
  USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE INDEX availability_account_weekday_idx ON public.availability_rules(account_id, weekday) WHERE is_active;
CREATE TRIGGER availability_rules_updated_at BEFORE UPDATE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL DEFAULT 'compromisso' CHECK (category IN ('ferias','feriado','compromisso','reuniao','outro')),
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) > 0),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blocks TO authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage schedule blocks" ON public.schedule_blocks FOR ALL TO authenticated
  USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE INDEX schedule_blocks_account_period_idx ON public.schedule_blocks USING gist (account_id, tstzrange(starts_at, ends_at, '[)'));
CREATE TRIGGER schedule_blocks_updated_at BEFORE UPDATE ON public.schedule_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0),
  default_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (default_duration_minutes BETWEEN 5 AND 720),
  color_key TEXT NOT NULL DEFAULT 'teal' CHECK (color_key IN ('teal','green','amber','rose','blue','gray')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_types TO authenticated;
GRANT ALL ON public.appointment_types TO service_role;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage appointment types" ON public.appointment_types FOR ALL TO authenticated
  USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));
CREATE INDEX appointment_types_account_idx ON public.appointment_types(account_id) WHERE is_active;
CREATE TRIGGER appointment_types_updated_at BEFORE UPDATE ON public.appointment_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.appointments
  ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN started_at TIMESTAMPTZ,
  ADD COLUMN completed_at TIMESTAMPTZ;
CREATE INDEX appointments_room_idx ON public.appointments(room_id);
CREATE INDEX appointments_type_idx ON public.appointments(appointment_type_id);

CREATE TABLE public.appointment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  actor_user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('criado','atualizado','confirmado','iniciado','concluido','cancelado','falta','reagendado')),
  previous_starts_at TIMESTAMPTZ,
  previous_ends_at TIMESTAMPTZ,
  new_starts_at TIMESTAMPTZ,
  new_ends_at TIMESTAMPTZ,
  reason TEXT,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.appointment_events TO authenticated;
GRANT ALL ON public.appointment_events TO service_role;
ALTER TABLE public.appointment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members read appointment events" ON public.appointment_events FOR SELECT TO authenticated
  USING (public.is_account_member(account_id));
CREATE INDEX appointment_events_appointment_idx ON public.appointment_events(appointment_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_schedule_references()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_id IS NULL OR NOT public.is_account_member(NEW.account_id) THEN
    RAISE EXCEPTION 'A conta informada não está disponível para este usuário.';
  END IF;
  IF NEW.location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.id = NEW.location_id AND l.account_id = NEW.account_id
  ) THEN RAISE EXCEPTION 'O local informado não pertence a esta conta.'; END IF;
  IF NEW.room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.id = NEW.room_id AND r.account_id = NEW.account_id
      AND (NEW.location_id IS NULL OR r.location_id = NEW.location_id)
  ) THEN RAISE EXCEPTION 'A sala informada não pertence ao local desta conta.'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rooms_owned_references BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_references();
CREATE TRIGGER availability_owned_references BEFORE INSERT OR UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_references();
CREATE TRIGGER blocks_owned_references BEFORE INSERT OR UPDATE ON public.schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_references();

CREATE OR REPLACE FUNCTION public.validate_owned_references()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_id IS NULL OR NOT public.is_account_member(NEW.account_id) THEN
    RAISE EXCEPTION 'A conta informada não está disponível para este usuário.';
  END IF;
  IF TG_TABLE_NAME = 'guardians' THEN
    IF NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id=NEW.patient_id AND p.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O paciente informado não pertence a esta conta.'; END IF;
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF NEW.patient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id=NEW.patient_id AND p.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O paciente informado não pertence a esta conta.'; END IF;
    IF NEW.location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.id=NEW.location_id AND l.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O local informado não pertence a esta conta.'; END IF;
    IF NEW.room_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id=NEW.room_id AND r.account_id=NEW.account_id AND (NEW.location_id IS NULL OR r.location_id=NEW.location_id)) THEN RAISE EXCEPTION 'A sala informada não pertence ao local desta conta.'; END IF;
    IF NEW.appointment_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.appointment_types t WHERE t.id=NEW.appointment_type_id AND t.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O tipo de atendimento não pertence a esta conta.'; END IF;
  ELSIF TG_TABLE_NAME = 'anamneses' THEN
    IF NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id=NEW.patient_id AND p.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O paciente informado não pertence a esta conta.'; END IF;
    IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=NEW.appointment_id AND a.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O atendimento informado não pertence a esta conta.'; END IF;
  ELSIF TG_TABLE_NAME = 'evolutions' THEN
    IF NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id=NEW.patient_id AND p.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O paciente informado não pertence a esta conta.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=NEW.appointment_id AND a.account_id=NEW.account_id AND a.patient_id=NEW.patient_id) THEN RAISE EXCEPTION 'O atendimento informado não pertence ao paciente desta conta.'; END IF;
  ELSIF TG_TABLE_NAME = 'documents' THEN
    IF NEW.patient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id=NEW.patient_id AND p.account_id=NEW.account_id) THEN RAISE EXCEPTION 'O paciente informado não pertence a esta conta.'; END IF;
  END IF;
  RETURN NEW;
END; $$;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_professional_no_overlap
  EXCLUDE USING gist (account_id WITH =, user_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status <> 'cancelado');
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_no_overlap
  EXCLUDE USING gist (account_id WITH =, patient_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status <> 'cancelado' AND patient_id IS NOT NULL);
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_room_no_overlap
  EXCLUDE USING gist (account_id WITH =, room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status <> 'cancelado' AND room_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE local_start TIMESTAMP; local_end TIMESTAMP; local_day DATE; local_weekday SMALLINT;
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'O horário final deve ser depois do horário inicial.'; END IF;
  IF NEW.status = 'cancelado' THEN
    IF NEW.cancellation_reason IS NULL OR char_length(btrim(NEW.cancellation_reason)) < 3 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento.'; END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.schedule_blocks b WHERE b.account_id=NEW.account_id AND b.starts_at < NEW.ends_at AND b.ends_at > NEW.starts_at AND (b.location_id IS NULL OR b.location_id=NEW.location_id) AND (b.room_id IS NULL OR b.room_id=NEW.room_id)) THEN
    RAISE EXCEPTION 'Este horário está bloqueado na agenda.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.availability_rules r WHERE r.account_id=NEW.account_id AND r.is_active) THEN
    local_start := NEW.starts_at AT TIME ZONE 'America/Sao_Paulo';
    local_end := NEW.ends_at AT TIME ZONE 'America/Sao_Paulo';
    local_day := local_start::date;
    local_weekday := extract(dow from local_start)::smallint;
    IF local_end::date <> local_day OR NOT EXISTS (
      SELECT 1 FROM public.availability_rules r WHERE r.account_id=NEW.account_id AND r.is_active
        AND r.weekday=local_weekday AND local_start::time >= r.start_time AND local_end::time <= r.end_time
        AND (r.valid_from IS NULL OR local_day >= r.valid_from) AND (r.valid_until IS NULL OR local_day <= r.valid_until)
        AND (r.location_id IS NULL OR r.location_id=NEW.location_id) AND (r.room_id IS NULL OR r.room_id=NEW.room_id)
        AND (r.modality IS NULL OR r.modality=NEW.modality)
    ) THEN RAISE EXCEPTION 'Este horário está fora da disponibilidade configurada.'; END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.record_appointment_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE event_name TEXT; fields TEXT[] := '{}';
BEGIN
  IF TG_OP='INSERT' THEN event_name := 'criado'; fields := ARRAY['starts_at','ends_at','status'];
  ELSE
    IF OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.ends_at IS DISTINCT FROM NEW.ends_at THEN event_name := 'reagendado'; fields := array_append(fields,'starts_at'); fields := array_append(fields,'ends_at');
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      event_name := CASE NEW.status WHEN 'confirmado' THEN 'confirmado' WHEN 'em_andamento' THEN 'iniciado' WHEN 'realizado' THEN 'concluido' WHEN 'cancelado' THEN 'cancelado' WHEN 'falta' THEN 'falta' ELSE 'atualizado' END;
      fields := array_append(fields,'status');
    ELSE event_name := 'atualizado'; END IF;
    IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN fields := array_append(fields,'location_id'); END IF;
    IF OLD.room_id IS DISTINCT FROM NEW.room_id THEN fields := array_append(fields,'room_id'); END IF;
    IF OLD.patient_id IS DISTINCT FROM NEW.patient_id THEN fields := array_append(fields,'patient_id'); END IF;
  END IF;
  INSERT INTO public.appointment_events(account_id,appointment_id,actor_user_id,event_type,previous_starts_at,previous_ends_at,new_starts_at,new_ends_at,reason,changed_fields)
  VALUES(NEW.account_id,NEW.id,auth.uid(),event_name,CASE WHEN TG_OP='UPDATE' THEN OLD.starts_at END,CASE WHEN TG_OP='UPDATE' THEN OLD.ends_at END,NEW.starts_at,NEW.ends_at,NEW.cancellation_reason,fields);
  RETURN NEW;
END; $$;
CREATE TRIGGER appointment_event_history AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.record_appointment_event();

CREATE TRIGGER audit_rooms AFTER INSERT OR UPDATE OR DELETE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_availability AFTER INSERT OR UPDATE OR DELETE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_schedule_blocks AFTER INSERT OR UPDATE OR DELETE ON public.schedule_blocks FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_appointment_types AFTER INSERT OR UPDATE OR DELETE ON public.appointment_types FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();

CREATE OR REPLACE FUNCTION public.complete_onboarding_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE key_name TEXT; target_account UUID;
BEGIN
  target_account := NEW.account_id;
  IF TG_TABLE_NAME='locations' THEN key_name := 'location';
  ELSIF TG_TABLE_NAME='rooms' THEN key_name := 'room';
  ELSIF TG_TABLE_NAME='availability_rules' THEN key_name := 'availability';
  ELSIF TG_TABLE_NAME='patients' THEN key_name := 'patient';
  ELSIF TG_TABLE_NAME='appointments' THEN key_name := 'appointment';
  END IF;
  IF key_name IS NOT NULL THEN UPDATE public.onboarding_tasks SET completed_at=COALESCE(completed_at,now()) WHERE account_id=target_account AND task_key=key_name; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER complete_room_task AFTER INSERT ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_task();
CREATE TRIGGER complete_availability_task AFTER INSERT ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_task();
