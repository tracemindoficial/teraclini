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
 INSERT INTO public.platform_audit_events(actor_user_id,action,entity_type,entity_id,account_id,result) VALUES(_actor_user_id,'user.delete_prepared','user',_target_user_id,a.id,'success');
 RETURN a.id;
END $$;
REVOKE ALL ON FUNCTION public.admin_prepare_client_deletion(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_client_deletion(uuid,uuid,text) TO service_role;