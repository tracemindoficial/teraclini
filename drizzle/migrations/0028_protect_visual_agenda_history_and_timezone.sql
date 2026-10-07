CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'O horário final deve ser depois do horário inicial.'; END IF;
  IF TG_OP = 'UPDATE' AND (OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.ends_at IS DISTINCT FROM NEW.ends_at)
     AND (OLD.status IN ('realizado','em_andamento','falta','cancelado') OR OLD.starts_at < now()) THEN
    RAISE EXCEPTION 'Atendimentos históricos, concluídos ou em andamento não podem ser movimentados.';
  END IF;
  IF NEW.status = 'cancelado' THEN
    IF NEW.cancellation_reason IS NULL OR char_length(btrim(NEW.cancellation_reason)) < 3 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento.'; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.starts_at IS NOT DISTINCT FROM NEW.starts_at AND OLD.ends_at IS NOT DISTINCT FROM NEW.ends_at
     AND OLD.location_id IS NOT DISTINCT FROM NEW.location_id AND OLD.room_id IS NOT DISTINCT FROM NEW.room_id
     AND OLD.modality IS NOT DISTINCT FROM NEW.modality AND OLD.status <> 'cancelado' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.schedule_blocks b WHERE b.account_id=NEW.account_id AND b.starts_at < NEW.ends_at AND b.ends_at > NEW.starts_at AND (b.location_id IS NULL OR b.location_id=NEW.location_id) AND (b.room_id IS NULL OR b.room_id=NEW.room_id)) THEN
    RAISE EXCEPTION 'Este horário está bloqueado na agenda.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.availability_rules r WHERE r.account_id=NEW.account_id AND r.is_active) AND NOT EXISTS (
    SELECT 1 FROM public.availability_rules r WHERE r.account_id=NEW.account_id AND r.is_active
      AND r.weekday=extract(dow FROM NEW.starts_at AT TIME ZONE r.timezone)::smallint
      AND (NEW.starts_at AT TIME ZONE r.timezone)::date = (NEW.ends_at AT TIME ZONE r.timezone)::date
      AND (NEW.starts_at AT TIME ZONE r.timezone)::time >= r.start_time
      AND (NEW.ends_at AT TIME ZONE r.timezone)::time <= r.end_time
      AND (r.valid_from IS NULL OR (NEW.starts_at AT TIME ZONE r.timezone)::date >= r.valid_from)
      AND (r.valid_until IS NULL OR (NEW.starts_at AT TIME ZONE r.timezone)::date <= r.valid_until)
      AND (r.location_id IS NULL OR r.location_id=NEW.location_id)
      AND (r.room_id IS NULL OR r.room_id=NEW.room_id)
      AND (r.modality IS NULL OR r.modality=NEW.modality)
  ) THEN RAISE EXCEPTION 'Este horário está fora da disponibilidade configurada.'; END IF;
  RETURN NEW;
END; $$;
REVOKE DELETE ON public.appointments FROM authenticated;
COMMENT ON FUNCTION public.check_appointment_conflict() IS 'Validates local availability per configured rule timezone and preserves historical appointment times; overlap exclusion constraints remain authoritative.';