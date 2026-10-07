ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS deletion_started_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_identity_at timestamptz;
CREATE TABLE public.admin_client_deletions (user_id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES public.accounts(id), actor_user_id uuid NOT NULL, stage text NOT NULL DEFAULT 'prepared', created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
GRANT ALL ON public.admin_client_deletions TO service_role;
ALTER TABLE public.admin_client_deletions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.guard_client_deletion_writes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE aid uuid; started timestamptz;
BEGIN
 aid := NEW.account_id;
 SELECT deletion_started_at INTO started FROM public.accounts WHERE id=aid FOR SHARE;
 IF started IS NOT NULL THEN RAISE EXCEPTION 'Conta em exclusão. Escrita indisponível.'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='account_id' AND table_name NOT IN ('admin_client_deletions','platform_audit_events','audit_events','account_access_events','appointment_events','care_package_events','payment_events','subscription_events') LOOP EXECUTE format('CREATE TRIGGER guard_client_deletion BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_client_deletion_writes()',t.table_name); END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.guard_deleted_account_reactivation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.deletion_started_at IS NOT NULL AND (NEW.status <> 'closed' OR NEW.blocked_at IS NULL OR NEW.deletion_started_at IS NULL) THEN RAISE EXCEPTION 'Exclusão em andamento ou concluída; reativação indisponível.'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_deleted_account_reactivation BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.guard_deleted_account_reactivation();
CREATE OR REPLACE FUNCTION public.admin_client_dependency_counts(_actor_user_id uuid,_target_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE aid uuid; counts jsonb := '{}'::jsonb; n bigint; t record;
BEGIN
 IF coalesce(public.platform_admin_role_for(_actor_user_id)::text,'') <> 'super_admin' OR NOT EXISTS(SELECT 1 FROM public.accounts WHERE owner_user_id=_actor_user_id AND status='active' AND blocked_at IS NULL) THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 SELECT id INTO aid FROM public.accounts WHERE owner_user_id=_target_user_id;
 IF aid IS NULL THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='account_id' AND table_name NOT IN ('admin_client_deletions','platform_audit_events','audit_events','account_access_events','account_members','user_roles','onboarding_tasks','profiles','specialties','appointment_types') LOOP
 EXECUTE format('SELECT count(*) FROM public.%I WHERE account_id=$1',t.table_name) INTO n USING aid;
 counts := counts || jsonb_build_object(t.table_name,n);
 END LOOP;
 SELECT count(*) INTO n FROM public.account_members WHERE account_id=aid AND user_id<>_target_user_id; counts:=counts||jsonb_build_object('other_members',n);
 SELECT count(*) INTO n FROM public.profiles WHERE account_id=aid AND id<>_target_user_id; counts:=counts||jsonb_build_object('other_profiles',n);
 SELECT count(*) INTO n FROM public.user_roles WHERE user_id=_target_user_id AND account_id<>aid; counts:=counts||jsonb_build_object('other_roles',n);
 SELECT count(*) INTO n FROM public.account_members WHERE user_id=_target_user_id AND account_id<>aid; counts:=counts||jsonb_build_object('other_memberships',n);
 SELECT count(*) INTO n FROM public.specialties WHERE account_id=aid AND (updated_at<>created_at OR NOT is_active OR name NOT IN ('Psicologia','Psicanálise','Neuropsicopedagogia','Psicopedagogia','Terapia','Neuropsicologia','Psiquiatria','Avaliação Psicológica','Orientação Profissional','Terapia Ocupacional','Fonoaudiologia','Nutrição','Serviço Social','Outra')); counts:=counts||jsonb_build_object('custom_specialties',n);
 SELECT count(*) INTO n FROM public.appointment_types WHERE account_id=aid AND (updated_at<>created_at OR NOT is_active OR description IS NOT NULL OR (name,default_duration_minutes,category) NOT IN (('Atendimento Clínico',50,'atendimento'),('Avaliação',90,'avaliacao'),('Devolutiva',50,'devolutiva'),('Reunião Externa',60,'reuniao'),('Entrevista Inicial',60,'avaliacao'),('Orientação',50,'atendimento'),('Supervisão',60,'atendimento'),('Acompanhamento',50,'atendimento'),('Reunião com Responsável',60,'reuniao'),('Reunião Escolar',60,'reuniao'),('Outro',60,'outro'))); counts:=counts||jsonb_build_object('custom_services',n);
 SELECT count(*) INTO n FROM public.help_events WHERE user_id=_target_user_id; counts:=counts||jsonb_build_object('help_events',n);
 SELECT count(*) INTO n FROM public.help_progress WHERE user_id=_target_user_id; counts:=counts||jsonb_build_object('help_progress',n);
 SELECT count(*) INTO n FROM storage.objects WHERE owner_id=_target_user_id::text OR split_part(name,'/',1) IN (_target_user_id::text,aid::text); counts:=counts||jsonb_build_object('files',n);
 RETURN counts;
END $$;
CREATE OR REPLACE FUNCTION public.admin_prepare_client_deletion(_actor_user_id uuid,_target_user_id uuid,_confirmation text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.accounts%ROWTYPE; counts jsonb;
BEGIN
 IF coalesce(public.platform_admin_role_for(_actor_user_id)::text,'')<>'super_admin' OR _actor_user_id=_target_user_id THEN RAISE EXCEPTION 'Operação não autorizada.'; END IF;
 SELECT * INTO a FROM public.accounts WHERE owner_user_id=_target_user_id FOR UPDATE;
 IF NOT FOUND OR a.deleted_identity_at IS NOT NULL THEN RAISE EXCEPTION 'Conta não disponível.'; END IF;
 IF EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=_target_user_id) OR EXISTS(SELECT 1 FROM auth.users WHERE id=_target_user_id AND lower(email)='eduardocomplex@gmail.com') THEN RAISE EXCEPTION 'Identidade protegida.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_target_user_id AND lower(email)=lower(trim(_confirmation))) THEN RAISE EXCEPTION 'Confirmação inválida.'; END IF;
 counts:=public.admin_client_dependency_counts(_actor_user_id,_target_user_id);
 IF EXISTS(SELECT 1 FROM jsonb_each_text(counts) WHERE value::bigint>0) THEN RAISE EXCEPTION 'Dados vinculados impedem a exclusão. Use a desativação.'; END IF;
 INSERT INTO public.admin_client_deletions(user_id,account_id,actor_user_id) VALUES(_target_user_id,a.id,_actor_user_id) ON CONFLICT(user_id) DO NOTHING;
 UPDATE public.accounts SET deletion_started_at=coalesce(deletion_started_at,now()),status='closed',blocked_at=coalesce(blocked_at,now()),block_reason='Exclusão individual em andamento',access_state_changed_by=_actor_user_id WHERE id=a.id;
 INSERT INTO public.platform_audit_events(actor_user_id,action,entity_type,entity_id,account_id,result) VALUES(_actor_user_id,'user.delete_prepared','user',_target_user_id,a.id,'prepared');
 RETURN a.id;
END $$;
CREATE OR REPLACE FUNCTION public.admin_finalize_client_deletion(_actor_user_id uuid,_target_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.admin_client_deletions%ROWTYPE;
BEGIN
 IF coalesce(public.platform_admin_role_for(_actor_user_id)::text,'')<>'super_admin' OR NOT EXISTS(SELECT 1 FROM public.accounts WHERE owner_user_id=_actor_user_id AND status='active' AND blocked_at IS NULL) THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 SELECT * INTO job FROM public.admin_client_deletions WHERE user_id=_target_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exclusão não preparada.'; END IF;
 IF job.stage='completed' THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=_target_user_id) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=_target_user_id) THEN RAISE EXCEPTION 'Identidade ainda existe.'; END IF;
 DELETE FROM public.onboarding_tasks WHERE account_id=job.account_id;
 DELETE FROM public.user_roles WHERE account_id=job.account_id AND user_id=_target_user_id;
 DELETE FROM public.account_members WHERE account_id=job.account_id AND user_id=_target_user_id;
 DELETE FROM public.appointment_types WHERE account_id=job.account_id;
 DELETE FROM public.specialties WHERE account_id=job.account_id;
 UPDATE public.accounts SET name='Conta arquivada',block_reason='Identidade excluída; auditoria preservada',deleted_identity_at=now() WHERE id=job.account_id;
 UPDATE public.admin_client_deletions SET stage='completed',completed_at=now() WHERE user_id=_target_user_id;
 INSERT INTO public.platform_audit_events(actor_user_id,action,entity_type,entity_id,account_id,result,details) VALUES(_actor_user_id,'user.delete_completed','user',_target_user_id,job.account_id,'success','{"identityDeleted":true,"accountArchived":true}'::jsonb);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.admin_client_dependency_counts(uuid,uuid),public.admin_prepare_client_deletion(uuid,uuid,text),public.admin_finalize_client_deletion(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_client_dependency_counts(uuid,uuid),public.admin_prepare_client_deletion(uuid,uuid,text),public.admin_finalize_client_deletion(uuid,uuid) TO service_role;