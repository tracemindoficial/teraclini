ALTER FUNCTION public.snapshot_care_package_price() SECURITY DEFINER;
ALTER FUNCTION public.snapshot_care_package_price() SET search_path=public,pg_temp;
REVOKE EXECUTE ON FUNCTION public.record_professional_financial_event(), public.appointment_finance_link(), public.package_finance_link(), public.lock_package_consumption() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.schedule_care_package(_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE aid uuid:=public.current_account_id(); p public.care_packages%ROWTYPE; price public.service_prices%ROWTYPE; pid uuid; patient uuid; key uuid; quantity integer; total integer; discount integer; unit integer; mode text; mod public.appointment_modality; dur integer; slot jsonb; n integer; used integer; start_at timestamptz; end_at timestamptz;
BEGIN
 IF NOT coalesce(public.can_manage_professional_finance(aid),false) THEN RAISE EXCEPTION 'Sem permissão para contratar/agendar pacote.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(aid::text,0));
 key:=(_payload->>'request_key')::uuid; IF key IS NULL THEN RAISE EXCEPTION 'Identificador da operação obrigatório.'; END IF;
 SELECT package_id INTO pid FROM public.appointments WHERE account_id=aid AND package_scheduling_key=key LIMIT 1; IF pid IS NOT NULL THEN RETURN pid; END IF;
 IF jsonb_typeof(_payload->'slots') IS DISTINCT FROM 'array' OR jsonb_array_length(_payload->'slots')<1 THEN RAISE EXCEPTION 'Informe as datas das sessões.'; END IF;
 n:=jsonb_array_length(_payload->'slots');
 IF nullif(_payload->>'package_id','') IS NOT NULL THEN
 SELECT * INTO p FROM public.care_packages WHERE id=(_payload->>'package_id')::uuid AND account_id=aid FOR UPDATE; IF p.id IS NULL OR p.lifecycle_status<>'ativo' THEN RAISE EXCEPTION 'Pacote ativo não encontrado.'; END IF;
 pid:=p.id; patient:=p.patient_id; quantity:=p.quantity; dur:=coalesce(p.contracted_duration_minutes,(_payload->>'duration_minutes')::integer,50); mod:=coalesce(p.scheduled_modality,(_payload->>'modality')::public.appointment_modality);
 SELECT count(*) INTO used FROM public.appointments WHERE package_id=p.id; IF used+n>quantity THEN RAISE EXCEPTION 'A quantidade de sessões vinculadas ultrapassa o contrato. Reagende sessões existentes.'; END IF;
 ELSE
 SELECT id INTO pid FROM public.care_packages WHERE account_id=aid AND scheduling_key=key; IF pid IS NOT NULL THEN RETURN pid; END IF;
 SELECT * INTO price FROM public.service_prices WHERE id=(_payload->>'service_price_id')::uuid AND account_id=aid AND is_active; IF price.id IS NULL THEN RAISE EXCEPTION 'Selecione um preço ativo.'; END IF;
 patient:=(_payload->>'patient_id')::uuid; IF NOT EXISTS(SELECT 1 FROM public.patients WHERE id=patient AND account_id=aid) THEN RAISE EXCEPTION 'Paciente inválido.'; END IF;
 quantity:=(_payload->>'quantity')::integer; IF quantity IS NULL OR quantity<1 OR quantity<>n THEN RAISE EXCEPTION 'Revise a quantidade e as datas.'; END IF;
 dur:=price.duration_minutes; mod:=(_payload->>'modality')::public.appointment_modality; IF mod IS NULL OR mod NOT IN ('presencial','online') OR NOT (price.modality IN ('todas','hibrido') OR price.modality=mod::text) THEN RAISE EXCEPTION 'Modalidade incompatível com o preço.'; END IF;
 unit:=CASE WHEN price.billing_type='avulso' THEN price.price_cents ELSE round(price.price_cents::numeric/price.package_quantity)::integer END; discount:=coalesce((_payload->>'discount_cents')::integer,0);
 total:=CASE WHEN price.billing_type='pacote' AND quantity=price.package_quantity THEN price.price_cents ELSE unit*quantity END-discount;
 mode:=_payload->>'finance_mode'; IF total IS NULL OR total<0 OR discount<0 OR mode IS NULL OR mode NOT IN ('prepaid','per_session') THEN RAISE EXCEPTION 'Revise desconto e modelo financeiro.'; END IF;
 INSERT INTO public.care_packages(account_id,user_id,patient_id,appointment_type_id,service_price_id,quantity,total_value_cents,start_date,periodicity,renewal_alert_threshold,finance_mode,contracted_unit_cents,discount_cents,scheduled_modality,contracted_duration_minutes,scheduling_key) VALUES(aid,auth.uid(),patient,price.appointment_type_id,price.id,quantity,total,(_payload->'slots'->0->>'date')::date,CASE WHEN _payload->>'frequency'='weekly' THEN 'semanal'::public.care_package_periodicity WHEN _payload->>'frequency'='fortnightly' THEN 'quinzenal'::public.care_package_periodicity ELSE 'personalizada'::public.care_package_periodicity END,least(2,quantity),mode,unit,discount,mod,dur,key) RETURNING * INTO p; pid:=p.id;
 END IF;
 IF dur<5 OR dur>720 OR mod IS NULL THEN RAISE EXCEPTION 'Duração/modalidade inválida.'; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(_payload->'slots') LOOP
 IF nullif(slot->>'date','') IS NULL OR nullif(slot->>'time','') IS NULL THEN RAISE EXCEPTION 'Data e horário obrigatórios em todas as sessões.'; END IF;
 start_at:=((slot->>'date')||' '||(slot->>'time'))::timestamp AT TIME ZONE 'America/Sao_Paulo'; end_at:=start_at+make_interval(mins=>dur);
 INSERT INTO public.appointments(account_id,user_id,patient_id,appointment_type_id,package_id,package_scheduling_key,starts_at,ends_at,modality,location_id,room_id,status,service_name_snapshot,duration_minutes_snapshot) VALUES(aid,auth.uid(),patient,p.appointment_type_id,pid,key,start_at,end_at,mod,nullif(_payload->>'location_id','')::uuid,nullif(_payload->>'room_id','')::uuid,'agendado',p.service_name_snapshot,dur);
 END LOOP; RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.schedule_care_package(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.schedule_care_package(jsonb) TO authenticated,service_role;
