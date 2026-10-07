CREATE OR REPLACE FUNCTION public.can_manage_professional_finance(_account_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT public.is_account_member(_account_id) AND (public.has_account_role(_account_id,'owner') OR public.has_account_role(_account_id,'finance')); $$;
REVOKE ALL ON FUNCTION public.can_manage_professional_finance(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.can_manage_professional_finance(uuid) TO authenticated,service_role;
ALTER TABLE public.care_packages ADD COLUMN IF NOT EXISTS finance_mode text NOT NULL DEFAULT 'none' CHECK (finance_mode IN ('none','prepaid','per_session')), ADD COLUMN IF NOT EXISTS contracted_unit_cents integer CHECK(contracted_unit_cents>=0), ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0 CHECK(discount_cents>=0), ADD COLUMN IF NOT EXISTS scheduled_modality public.appointment_modality, ADD COLUMN IF NOT EXISTS contracted_duration_minutes integer, ADD COLUMN IF NOT EXISTS scheduling_key uuid;
CREATE UNIQUE INDEX care_packages_scheduling_key_idx ON public.care_packages(account_id,scheduling_key) WHERE scheduling_key IS NOT NULL;
CREATE TABLE public.professional_receivables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES public.accounts(id), patient_id uuid NOT NULL REFERENCES public.patients(id), appointment_type_id uuid REFERENCES public.appointment_types(id), appointment_id uuid REFERENCES public.appointments(id), package_id uuid REFERENCES public.care_packages(id), origin text NOT NULL CHECK(origin IN ('one_off','package','package_session')),amount_cents bigint NOT NULL CHECK(amount_cents>=0),due_on date NOT NULL,service_name_snapshot text NOT NULL,modality text, cancelled_at timestamptz,created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK((origin='one_off' AND appointment_id IS NOT NULL AND package_id IS NULL) OR (origin='package' AND appointment_id IS NULL AND package_id IS NOT NULL) OR (origin='package_session' AND appointment_id IS NOT NULL AND package_id IS NOT NULL)));
GRANT SELECT ON public.professional_receivables TO authenticated; GRANT ALL ON public.professional_receivables TO service_role;
ALTER TABLE public.professional_receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_read_receivables ON public.professional_receivables FOR SELECT TO authenticated USING(public.can_manage_professional_finance(account_id));
CREATE UNIQUE INDEX professional_receivables_appointment_idx ON public.professional_receivables(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE UNIQUE INDEX professional_receivables_package_idx ON public.professional_receivables(package_id) WHERE origin='package';
CREATE INDEX professional_receivables_account_due_idx ON public.professional_receivables(account_id,due_on,id);
CREATE TABLE public.professional_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES public.accounts(id),receivable_id uuid NOT NULL REFERENCES public.professional_receivables(id),amount_cents bigint NOT NULL CHECK(amount_cents>0),received_on date NOT NULL,method text NOT NULL CHECK(method IN ('pix','card','cash','transfer','other')),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','reversed','cancelled')),note text,request_key uuid NOT NULL,created_by uuid NOT NULL,confirmed_by uuid,confirmed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(account_id,request_key));
GRANT SELECT ON public.professional_receipts TO authenticated; GRANT ALL ON public.professional_receipts TO service_role;
ALTER TABLE public.professional_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_read_receipts ON public.professional_receipts FOR SELECT TO authenticated USING(public.can_manage_professional_finance(account_id));
CREATE INDEX professional_receipts_title_status_idx ON public.professional_receipts(receivable_id,status);
CREATE INDEX professional_receipts_account_date_idx ON public.professional_receipts(account_id,received_on,id);
CREATE TABLE public.professional_financial_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES public.accounts(id),receivable_id uuid NOT NULL REFERENCES public.professional_receivables(id),receipt_id uuid REFERENCES public.professional_receipts(id),actor_user_id uuid,event_type text NOT NULL,previous_values jsonb NOT NULL DEFAULT '{}',new_values jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.professional_financial_events TO authenticated; GRANT ALL ON public.professional_financial_events TO service_role;
ALTER TABLE public.professional_financial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_read_events ON public.professional_financial_events FOR SELECT TO authenticated USING(public.can_manage_professional_finance(account_id));
CREATE INDEX professional_financial_events_title_time_idx ON public.professional_financial_events(receivable_id,created_at);
CREATE TRIGGER finance_events_immutable BEFORE UPDATE OR DELETE ON public.professional_financial_events FOR EACH ROW EXECUTE FUNCTION public.prevent_operational_history_mutation();
CREATE TRIGGER finance_receivable_deletion_guard BEFORE INSERT OR UPDATE ON public.professional_receivables FOR EACH ROW EXECUTE FUNCTION public.guard_client_deletion_writes();
CREATE TRIGGER finance_receipt_deletion_guard BEFORE INSERT OR UPDATE ON public.professional_receipts FOR EACH ROW EXECUTE FUNCTION public.guard_client_deletion_writes();
CREATE TRIGGER finance_event_deletion_guard BEFORE INSERT OR UPDATE ON public.professional_financial_events FOR EACH ROW EXECUTE FUNCTION public.guard_client_deletion_writes();
CREATE OR REPLACE FUNCTION public.record_professional_financial_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE before_json jsonb:='{}'; after_json jsonb; title uuid;
BEGIN
 IF TG_OP='UPDATE' THEN before_json:=to_jsonb(OLD)-'note'; END IF; after_json:=to_jsonb(NEW)-'note';
 IF TG_TABLE_NAME='professional_receivables' THEN title:=NEW.id; ELSE title:=NEW.receivable_id; END IF;
 INSERT INTO public.professional_financial_events(account_id,receivable_id,receipt_id,actor_user_id,event_type,previous_values,new_values) VALUES(NEW.account_id,title,CASE WHEN TG_TABLE_NAME='professional_receipts' THEN NEW.id ELSE NULL END,auth.uid(),TG_TABLE_NAME||'_'||lower(TG_OP),before_json,after_json); RETURN NEW;
END $$;
CREATE TRIGGER finance_title_audit AFTER INSERT OR UPDATE ON public.professional_receivables FOR EACH ROW EXECUTE FUNCTION public.record_professional_financial_event();
CREATE TRIGGER finance_receipt_audit AFTER INSERT OR UPDATE ON public.professional_receipts FOR EACH ROW EXECUTE FUNCTION public.record_professional_financial_event();
CREATE OR REPLACE FUNCTION public.snapshot_care_package_price() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE price public.service_prices%ROWTYPE; service public.appointment_types%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' AND (OLD.lifecycle_status IN ('encerrado','cancelado') OR EXISTS(SELECT 1 FROM public.professional_receivables WHERE package_id=OLD.id)) AND (NEW.appointment_type_id IS DISTINCT FROM OLD.appointment_type_id OR NEW.service_price_id IS DISTINCT FROM OLD.service_price_id OR NEW.service_name_snapshot IS DISTINCT FROM OLD.service_name_snapshot OR NEW.total_value_cents IS DISTINCT FROM OLD.total_value_cents OR NEW.total_value IS DISTINCT FROM OLD.total_value OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.finance_mode IS DISTINCT FROM OLD.finance_mode OR NEW.discount_cents IS DISTINCT FROM OLD.discount_cents OR NEW.contracted_unit_cents IS DISTINCT FROM OLD.contracted_unit_cents) THEN RAISE EXCEPTION 'Contrato com histórico financeiro ou encerrado não pode ser reescrito. Crie uma renovação.'; END IF;
 IF NEW.service_price_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.service_price_id IS DISTINCT FROM OLD.service_price_id) THEN
 SELECT * INTO price FROM public.service_prices WHERE id=NEW.service_price_id AND account_id=NEW.account_id;
 IF price.id IS NULL OR NOT price.is_active THEN RAISE EXCEPTION 'Preço não disponível para esta conta.'; END IF;
 IF price.billing_type='avulso' AND NEW.scheduling_key IS NULL THEN RAISE EXCEPTION 'Selecione uma oferta de pacote.'; END IF;
 NEW.appointment_type_id:=price.appointment_type_id;
 IF NEW.scheduling_key IS NULL THEN NEW.quantity:=price.package_quantity; NEW.total_value_cents:=price.price_cents; END IF;
 END IF;
 IF NEW.total_value_cents IS NULL AND NEW.total_value IS NOT NULL THEN NEW.total_value_cents:=round(NEW.total_value*100)::integer; END IF;
 IF NEW.total_value_cents IS NOT NULL THEN NEW.total_value:=NEW.total_value_cents::numeric/100; NEW.value_per_session_cents:=round(NEW.total_value_cents::numeric/NEW.quantity)::integer; NEW.value_per_session:=NEW.value_per_session_cents::numeric/100; END IF;
 IF NEW.appointment_type_id IS NOT NULL AND (NEW.service_name_snapshot IS NULL OR TG_OP='INSERT') THEN SELECT * INTO service FROM public.appointment_types WHERE id=NEW.appointment_type_id AND account_id=NEW.account_id; IF service.id IS NULL THEN RAISE EXCEPTION 'Serviço inválido.'; END IF; NEW.service_name_snapshot:=service.name; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.create_professional_receivable(_appointment_id uuid DEFAULT NULL,_package_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.appointments%ROWTYPE; p public.care_packages%ROWTYPE; result uuid; amount bigint; pos integer;
BEGIN
 IF _appointment_id IS NOT NULL THEN
 SELECT * INTO a FROM public.appointments WHERE id=_appointment_id FOR UPDATE;
 IF a.id IS NULL OR a.patient_id IS NULL THEN RETURN NULL; END IF;
 SELECT id INTO result FROM public.professional_receivables WHERE appointment_id=a.id; IF result IS NOT NULL THEN RETURN result; END IF;
 IF a.package_id IS NULL THEN
 IF a.price_cents_snapshot IS NULL THEN RETURN NULL; END IF;
 INSERT INTO public.professional_receivables(account_id,patient_id,appointment_type_id,appointment_id,origin,amount_cents,due_on,service_name_snapshot,modality,created_by) VALUES(a.account_id,a.patient_id,a.appointment_type_id,a.id,'one_off',a.price_cents_snapshot,(a.starts_at AT TIME ZONE 'America/Sao_Paulo')::date,coalesce(a.service_name_snapshot,'Atendimento'),a.modality::text,a.user_id) RETURNING id INTO result;
 ELSE
 SELECT * INTO p FROM public.care_packages WHERE id=a.package_id FOR UPDATE;
 IF p.finance_mode='prepaid' THEN RETURN public.create_professional_receivable(NULL,p.id); END IF;
 IF p.finance_mode<>'per_session' OR p.total_value_cents IS NULL THEN RETURN NULL; END IF;
 SELECT count(*) INTO pos FROM public.professional_receivables WHERE package_id=p.id AND origin='package_session';
 IF pos>=p.quantity THEN RAISE EXCEPTION 'Todas as parcelas deste pacote já foram vinculadas. Reagende uma sessão existente.'; END IF;
 amount:=p.total_value_cents/p.quantity+CASE WHEN pos < p.total_value_cents%p.quantity THEN 1 ELSE 0 END;
 INSERT INTO public.professional_receivables(account_id,patient_id,appointment_type_id,appointment_id,package_id,origin,amount_cents,due_on,service_name_snapshot,modality,created_by) VALUES(a.account_id,a.patient_id,p.appointment_type_id,a.id,p.id,'package_session',amount,(a.starts_at AT TIME ZONE 'America/Sao_Paulo')::date,coalesce(p.service_name_snapshot,'Pacote'),a.modality::text,a.user_id) RETURNING id INTO result;
 END IF;
 ELSE
 SELECT * INTO p FROM public.care_packages WHERE id=_package_id FOR UPDATE;
 IF p.id IS NULL OR p.finance_mode<>'prepaid' OR p.total_value_cents IS NULL THEN RETURN NULL; END IF;
 SELECT id INTO result FROM public.professional_receivables WHERE package_id=p.id AND origin='package'; IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO public.professional_receivables(account_id,patient_id,appointment_type_id,package_id,origin,amount_cents,due_on,service_name_snapshot,modality,created_by) VALUES(p.account_id,p.patient_id,p.appointment_type_id,p.id,'package',p.total_value_cents,p.start_date,coalesce(p.service_name_snapshot,'Pacote'),p.scheduled_modality::text,p.user_id) RETURNING id INTO result;
 END IF; RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_professional_receivable(uuid,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.create_professional_receivable(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.appointment_finance_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.professional_receivables WHERE appointment_id=OLD.id) AND (NEW.patient_id IS DISTINCT FROM OLD.patient_id OR NEW.package_id IS DISTINCT FROM OLD.package_id OR NEW.appointment_type_id IS DISTINCT FROM OLD.appointment_type_id OR NEW.service_price_id IS DISTINCT FROM OLD.service_price_id OR NEW.price_cents_snapshot IS DISTINCT FROM OLD.price_cents_snapshot) THEN RAISE EXCEPTION 'O vínculo e valor deste atendimento têm histórico financeiro e devem ser preservados.'; END IF;
 IF TG_OP='INSERT' THEN PERFORM public.create_professional_receivable(NEW.id,NULL); END IF; RETURN NEW;
END $$;
CREATE TRIGGER appointment_finance_link AFTER INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.appointment_finance_link();
CREATE OR REPLACE FUNCTION public.package_finance_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN IF NEW.finance_mode='prepaid' THEN PERFORM public.create_professional_receivable(NULL,NEW.id); END IF; RETURN NEW; END $$;
CREATE TRIGGER package_finance_link AFTER INSERT ON public.care_packages FOR EACH ROW EXECUTE FUNCTION public.package_finance_link();
CREATE OR REPLACE FUNCTION public.finance_import_contract(_appointment_id uuid DEFAULT NULL,_package_id uuid DEFAULT NULL,_mode text DEFAULT 'prepaid') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE aid uuid; p public.care_packages%ROWTYPE; result uuid; a record;
BEGIN
 IF _appointment_id IS NOT NULL THEN SELECT account_id INTO aid FROM public.appointments WHERE id=_appointment_id; ELSE SELECT * INTO p FROM public.care_packages WHERE id=_package_id FOR UPDATE; aid:=p.account_id; END IF;
 IF NOT coalesce(public.can_manage_professional_finance(aid),false) THEN RAISE EXCEPTION 'Sem permissão financeira.'; END IF;
 IF _appointment_id IS NOT NULL THEN RETURN public.create_professional_receivable(_appointment_id,NULL); END IF;
 IF _mode NOT IN ('prepaid','per_session') OR p.total_value_cents IS NULL THEN RAISE EXCEPTION 'Defina o valor do contrato antes de incluir no financeiro.'; END IF;
 IF p.finance_mode='none' THEN UPDATE public.care_packages SET finance_mode=_mode WHERE id=p.id; ELSIF p.finance_mode<>_mode THEN RAISE EXCEPTION 'Modelo financeiro já definido.'; END IF;
 IF _mode='prepaid' THEN RETURN public.create_professional_receivable(NULL,p.id); END IF;
 FOR a IN SELECT id FROM public.appointments WHERE package_id=p.id ORDER BY starts_at,id LOOP result:=public.create_professional_receivable(a.id,NULL); END LOOP; RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.finance_import_contract(uuid,uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.finance_import_contract(uuid,uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.finance_receipt_action(_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE action text:=_payload->>'action'; r public.professional_receipts%ROWTYPE; t public.professional_receivables%ROWTYPE; rid uuid; amount bigint; paid bigint; target_status text; key uuid; received date; method text;
BEGIN
 IF action='create' THEN SELECT * INTO t FROM public.professional_receivables WHERE id=(_payload->>'receivable_id')::uuid FOR UPDATE;
 ELSE SELECT * INTO r FROM public.professional_receipts WHERE id=(_payload->>'id')::uuid; SELECT * INTO t FROM public.professional_receivables WHERE id=r.receivable_id FOR UPDATE; SELECT * INTO r FROM public.professional_receipts WHERE id=r.id FOR UPDATE; END IF;
 IF t.id IS NULL OR NOT coalesce(public.can_manage_professional_finance(t.account_id),false) THEN RAISE EXCEPTION 'Título não encontrado ou sem permissão.'; END IF;
 IF action='create' THEN key:=(_payload->>'request_key')::uuid; SELECT id INTO rid FROM public.professional_receipts WHERE account_id=t.account_id AND request_key=key; IF rid IS NOT NULL THEN RETURN rid; END IF; target_status:=CASE WHEN coalesce((_payload->>'confirmed')::boolean,false) THEN 'confirmed' ELSE 'pending' END;
 ELSIF action='confirm' THEN IF r.status<>'pending' THEN RAISE EXCEPTION 'Somente um recebimento pendente pode ser confirmado.'; END IF; target_status:='confirmed';
 ELSIF action='reverse' THEN IF r.status<>'confirmed' THEN RAISE EXCEPTION 'Somente um recebimento confirmado pode ser estornado.'; END IF; target_status:='reversed';
 ELSIF action='cancel' THEN IF r.status<>'pending' THEN RAISE EXCEPTION 'Somente um recebimento pendente pode ser cancelado.'; END IF; target_status:='cancelled';
 ELSIF action='edit' THEN IF r.status NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'Movimento encerrado não pode ser editado.'; END IF; target_status:=r.status;
 ELSE RAISE EXCEPTION 'Ação inválida.'; END IF;
 amount:=coalesce((_payload->>'amount_cents')::bigint,r.amount_cents); received:=coalesce((_payload->>'received_on')::date,r.received_on); method:=coalesce(_payload->>'method',r.method);
 IF amount IS NULL OR amount<=0 OR amount>2147483647 OR received IS NULL OR method NOT IN ('pix','card','cash','transfer','other') THEN RAISE EXCEPTION 'Revise valor, data e forma de pagamento.'; END IF;
 IF t.cancelled_at IS NOT NULL AND target_status IN ('pending','confirmed') THEN RAISE EXCEPTION 'Título cancelado não recebe pagamentos.'; END IF;
 SELECT coalesce(sum(amount_cents),0) INTO paid FROM public.professional_receipts WHERE receivable_id=t.id AND status='confirmed' AND (r.id IS NULL OR id<>r.id);
 IF target_status='confirmed' AND paid+amount>t.amount_cents THEN RAISE EXCEPTION 'O recebimento ultrapassa o saldo contratado.'; END IF;
 IF action='create' THEN INSERT INTO public.professional_receipts(account_id,receivable_id,amount_cents,received_on,method,status,note,request_key,created_by,confirmed_by,confirmed_at) VALUES(t.account_id,t.id,amount,received,method,target_status,left(_payload->>'note',1000),key,auth.uid(),CASE WHEN target_status='confirmed' THEN auth.uid() END,CASE WHEN target_status='confirmed' THEN now() END) RETURNING id INTO rid;
 ELSE UPDATE public.professional_receipts SET amount_cents=amount,received_on=received,method=method,status=target_status,note=CASE WHEN _payload ? 'note' THEN left(_payload->>'note',1000) ELSE note END,confirmed_at=CASE WHEN target_status='confirmed' THEN coalesce(confirmed_at,now()) ELSE confirmed_at END,confirmed_by=CASE WHEN target_status='confirmed' THEN coalesce(confirmed_by,auth.uid()) ELSE confirmed_by END,updated_at=now() WHERE id=r.id RETURNING id INTO rid; END IF; RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.finance_receipt_action(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.finance_receipt_action(jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.finance_cancel_title(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.professional_receivables%ROWTYPE; BEGIN SELECT * INTO t FROM public.professional_receivables WHERE id=_id FOR UPDATE; IF t.id IS NULL OR NOT coalesce(public.can_manage_professional_finance(t.account_id),false) THEN RAISE EXCEPTION 'Sem permissão.'; END IF; IF EXISTS(SELECT 1 FROM public.professional_receipts WHERE receivable_id=t.id AND status IN ('pending','confirmed')) THEN RAISE EXCEPTION 'Estorne ou cancele os recebimentos antes de cancelar o título.'; END IF; UPDATE public.professional_receivables SET cancelled_at=now(),updated_at=now() WHERE id=t.id AND cancelled_at IS NULL; END $$;
REVOKE ALL ON FUNCTION public.finance_cancel_title(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.finance_cancel_title(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.schedule_care_package(_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE aid uuid:=public.current_account_id(); p public.care_packages%ROWTYPE; price public.service_prices%ROWTYPE; pid uuid; patient uuid; key uuid; quantity integer; total integer; discount integer; unit integer; mode text; mod public.appointment_modality; dur integer; slot jsonb; n integer; used integer; start_at timestamptz; end_at timestamptz;
BEGIN
 IF NOT coalesce(public.can_manage_professional_finance(aid),false) THEN RAISE EXCEPTION 'Sem permissão para contratar/agendar pacote.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(aid::text,0));
 key:=(_payload->>'request_key')::uuid; IF key IS NULL THEN RAISE EXCEPTION 'Identificador da operação obrigatório.'; END IF;
 IF jsonb_typeof(_payload->'slots')<>'array' OR jsonb_array_length(_payload->'slots')<1 THEN RAISE EXCEPTION 'Informe as datas das sessões.'; END IF;
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
 dur:=price.duration_minutes; mod:=(_payload->>'modality')::public.appointment_modality; IF mod NOT IN ('presencial','online') OR NOT (price.modality IN ('todas','hibrido') OR price.modality=mod::text) THEN RAISE EXCEPTION 'Modalidade incompatível com o preço.'; END IF;
 unit:=CASE WHEN price.billing_type='avulso' THEN price.price_cents ELSE round(price.price_cents::numeric/price.package_quantity)::integer END; discount:=coalesce((_payload->>'discount_cents')::integer,0);
 total:=CASE WHEN price.billing_type='pacote' AND quantity=price.package_quantity THEN price.price_cents ELSE unit*quantity END-discount;
 mode:=_payload->>'finance_mode'; IF total<0 OR discount<0 OR mode NOT IN ('prepaid','per_session') THEN RAISE EXCEPTION 'Revise desconto e modelo financeiro.'; END IF;
 INSERT INTO public.care_packages(account_id,user_id,patient_id,appointment_type_id,service_price_id,quantity,total_value_cents,start_date,periodicity,renewal_alert_threshold,finance_mode,contracted_unit_cents,discount_cents,scheduled_modality,contracted_duration_minutes,scheduling_key) VALUES(aid,auth.uid(),patient,price.appointment_type_id,price.id,quantity,total,(_payload->'slots'->0->>'date')::date,CASE WHEN _payload->>'frequency'='weekly' THEN 'semanal'::public.care_package_periodicity WHEN _payload->>'frequency'='fortnightly' THEN 'quinzenal'::public.care_package_periodicity ELSE 'personalizada'::public.care_package_periodicity END,least(2,quantity),mode,unit,discount,mod,dur,key) RETURNING * INTO p; pid:=p.id;
 END IF;
 IF dur<5 OR dur>720 OR mod IS NULL THEN RAISE EXCEPTION 'Duração/modalidade inválida.'; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(_payload->'slots') LOOP
 start_at:=((slot->>'date')||' '||(slot->>'time'))::timestamp AT TIME ZONE 'America/Sao_Paulo'; end_at:=start_at+make_interval(mins=>dur);
 INSERT INTO public.appointments(account_id,user_id,patient_id,appointment_type_id,package_id,starts_at,ends_at,modality,location_id,room_id,status) VALUES(aid,auth.uid(),patient,p.appointment_type_id,pid,start_at,end_at,mod,nullif(_payload->>'location_id','')::uuid,nullif(_payload->>'room_id','')::uuid,'agendado');
 END LOOP; RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.schedule_care_package(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.schedule_care_package(jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.lock_package_consumption() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.package_id IS NOT NULL THEN PERFORM 1 FROM public.care_packages WHERE id=NEW.package_id FOR UPDATE; END IF; RETURN NEW; END $$;
CREATE TRIGGER aaa_lock_package_consumption BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.lock_package_consumption();
REVOKE DELETE ON public.care_packages FROM authenticated;
REVOKE ALL ON public.professional_receivables,public.professional_receipts,public.professional_financial_events FROM anon;
