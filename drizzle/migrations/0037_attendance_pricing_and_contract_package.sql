CREATE TABLE public.account_attendance_pricing (
  account_id uuid PRIMARY KEY REFERENCES public.accounts(id),
  single_session_cents integer NOT NULL DEFAULT 18000 CHECK (single_session_cents >= 0),
  package_total_cents integer NOT NULL DEFAULT 68000 CHECK (package_total_cents >= 0),
  package_quantity integer NOT NULL DEFAULT 4 CHECK (package_quantity BETWEEN 2 AND 52),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_attendance_pricing TO authenticated;
GRANT ALL ON public.account_attendance_pricing TO service_role;
ALTER TABLE public.account_attendance_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read attendance pricing" ON public.account_attendance_pricing FOR SELECT TO authenticated USING (public.is_account_member(account_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.get_attendance_pricing() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE aid uuid := public.current_account_id(); r public.account_attendance_pricing%ROWTYPE;
BEGIN
  IF aid IS NULL THEN RAISE EXCEPTION 'Conta indisponível.'; END IF;
  SELECT * INTO r FROM public.account_attendance_pricing WHERE account_id = aid;
  RETURN jsonb_build_object('single_session_cents', coalesce(r.single_session_cents,18000), 'package_total_cents', coalesce(r.package_total_cents,68000), 'package_quantity', coalesce(r.package_quantity,4));
END $$;

CREATE OR REPLACE FUNCTION public.save_attendance_pricing(_single_cents integer, _package_cents integer, _quantity integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE aid uuid := public.current_account_id();
BEGIN
  IF NOT coalesce(public.can_manage_professional_finance(aid),false) THEN RAISE EXCEPTION 'Sem permissão para alterar valores.'; END IF;
  IF _single_cents IS NULL OR _single_cents < 0 OR _package_cents IS NULL OR _package_cents < 0 OR _quantity IS NULL OR _quantity < 2 OR _quantity > 52 THEN RAISE EXCEPTION 'Revise os valores informados.'; END IF;
  INSERT INTO public.account_attendance_pricing(account_id,single_session_cents,package_total_cents,package_quantity,updated_by)
  VALUES (aid,_single_cents,_package_cents,_quantity,auth.uid())
  ON CONFLICT (account_id) DO UPDATE SET single_session_cents=EXCLUDED.single_session_cents, package_total_cents=EXCLUDED.package_total_cents, package_quantity=EXCLUDED.package_quantity, updated_by=EXCLUDED.updated_by, updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.schedule_contract_package(_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE aid uuid := public.current_account_id(); key uuid; pid uuid; patient uuid; qty integer; total integer; dur integer; mod public.appointment_modality; mode text; tid uuid; slot jsonb; idx integer := 0; start_at timestamptz; end_at timestamptz; loc uuid;
BEGIN
  IF NOT coalesce(public.can_manage_professional_finance(aid),false) THEN RAISE EXCEPTION 'Sem permissão para contratar pacote.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(aid::text,0));
  key := (_payload->>'request_key')::uuid; IF key IS NULL THEN RAISE EXCEPTION 'Identificador da operação obrigatório.'; END IF;
  SELECT id INTO pid FROM public.care_packages WHERE account_id=aid AND scheduling_key=key; IF pid IS NOT NULL THEN RETURN pid; END IF;
  IF jsonb_typeof(_payload->'slots') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Informe as datas das sessões.'; END IF;
  qty := jsonb_array_length(_payload->'slots');
  IF qty < 1 OR qty <> (_payload->>'quantity')::integer THEN RAISE EXCEPTION 'A quantidade de datas não corresponde ao pacote.'; END IF;
  patient := (_payload->>'patient_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id=patient AND account_id=aid) THEN RAISE EXCEPTION 'Paciente inválido.'; END IF;
  total := (_payload->>'total_cents')::integer; IF total IS NULL OR total < 0 THEN RAISE EXCEPTION 'Informe o valor total do pacote.'; END IF;
  dur := (_payload->>'duration_minutes')::integer; IF dur IS NULL OR dur < 5 OR dur > 720 THEN RAISE EXCEPTION 'Duração inválida.'; END IF;
  mod := (_payload->>'modality')::public.appointment_modality;
  mode := coalesce(_payload->>'finance_mode','prepaid'); IF mode NOT IN ('prepaid','per_session') THEN RAISE EXCEPTION 'Modelo financeiro inválido.'; END IF;
  tid := nullif(_payload->>'appointment_type_id','')::uuid;
  INSERT INTO public.care_packages(account_id,user_id,patient_id,appointment_type_id,quantity,total_value_cents,start_date,periodicity,renewal_alert_threshold,finance_mode,contracted_unit_cents,discount_cents,scheduled_modality,contracted_duration_minutes,scheduling_key)
  VALUES (aid,auth.uid(),patient,tid,qty,total,(_payload->'slots'->0->>'date')::date,CASE WHEN _payload->>'frequency'='weekly' THEN 'semanal'::public.care_package_periodicity ELSE 'personalizada'::public.care_package_periodicity END,least(2,qty),mode,round(total::numeric/qty)::integer,0,mod,dur,key)
  RETURNING id INTO pid;
  FOR slot IN SELECT value FROM jsonb_array_elements(_payload->'slots') LOOP
    idx := idx + 1;
    IF nullif(slot->>'date','') IS NULL OR nullif(slot->>'time','') IS NULL THEN RAISE EXCEPTION 'Sessão % de %: informe data e horário.', idx, qty; END IF;
    start_at := ((slot->>'date')||' '||(slot->>'time'))::timestamp AT TIME ZONE 'America/Sao_Paulo';
    end_at := start_at + make_interval(mins=>dur);
    loc := nullif(slot->>'location_id','')::uuid;
    BEGIN
      INSERT INTO public.appointments(account_id,user_id,patient_id,appointment_type_id,package_id,package_scheduling_key,starts_at,ends_at,modality,location_id,status,duration_minutes_snapshot)
      VALUES (aid,auth.uid(),patient,tid,pid,key,start_at,end_at,mod,loc,'agendado',dur);
    EXCEPTION WHEN exclusion_violation THEN
      RAISE EXCEPTION 'Sessão % de %: este horário já está ocupado.', idx, qty;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Sessão % de %: %', idx, qty, SQLERRM;
    END;
  END LOOP;
  RETURN pid;
END $$;

REVOKE ALL ON FUNCTION public.get_attendance_pricing() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_attendance_pricing(integer,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.schedule_contract_package(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_pricing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_attendance_pricing(integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_contract_package(jsonb) TO authenticated;