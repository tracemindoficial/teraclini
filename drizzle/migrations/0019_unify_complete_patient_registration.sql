CREATE OR REPLACE FUNCTION public.save_complete_patient(
  _payload JSONB,
  _patient_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_account_id UUID;
  result_patient_id UUID;
  owner_user_id UUID;
  guardian_id UUID;
  intake JSONB;
  is_new BOOLEAN := _patient_id IS NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  target_account_id := public.current_account_id();
  IF target_account_id IS NULL OR NOT public.is_account_member(target_account_id) THEN
    RAISE EXCEPTION 'Conta profissional não encontrada.';
  END IF;

  SELECT a.owner_user_id INTO owner_user_id
  FROM public.accounts a
  WHERE a.id = target_account_id;

  IF NULLIF(BTRIM(_payload->>'full_name'), '') IS NULL
     OR NULLIF(_payload->>'birth_date', '') IS NULL
     OR NULLIF(BTRIM(_payload->>'email'), '') IS NULL
     OR NULLIF(BTRIM(_payload->>'cpf'), '') IS NULL
     OR NULLIF(BTRIM(_payload->>'postal_code'), '') IS NULL
     OR NULLIF(BTRIM(_payload->>'city'), '') IS NULL
     OR char_length(BTRIM(COALESCE(_payload->>'state', ''))) <> 2
     OR NULLIF(BTRIM(_payload->>'therapy_reason'), '') IS NULL THEN
    RAISE EXCEPTION 'Revise os campos obrigatórios do cadastro.';
  END IF;

  IF _patient_id IS NULL THEN
    INSERT INTO public.patients (
      account_id, user_id, full_name, age_group, birth_date, gender, phone, email,
      address, city, state, status, notes, cpf, postal_code, address_number,
      address_complement, neighborhood, marital_status, education, occupation, registration_source
    ) VALUES (
      target_account_id, owner_user_id, BTRIM(_payload->>'full_name'),
      (_payload->>'age_group')::public.age_group, (_payload->>'birth_date')::date,
      NULLIF(BTRIM(_payload->>'gender'), ''), NULLIF(BTRIM(_payload->>'phone'), ''),
      lower(BTRIM(_payload->>'email')),
      concat_ws(', ', NULLIF(BTRIM(_payload->>'street'), ''), NULLIF(BTRIM(_payload->>'address_number'), ''), NULLIF(BTRIM(_payload->>'address_complement'), ''), NULLIF(BTRIM(_payload->>'neighborhood'), '')),
      BTRIM(_payload->>'city'), upper(BTRIM(_payload->>'state')),
      COALESCE(NULLIF(_payload->>'status', '')::public.patient_status, 'ativo'::public.patient_status),
      NULLIF(BTRIM(_payload->>'notes'), ''), regexp_replace(_payload->>'cpf', '\D', '', 'g'),
      regexp_replace(_payload->>'postal_code', '\D', '', 'g'), NULLIF(BTRIM(_payload->>'address_number'), ''),
      NULLIF(BTRIM(_payload->>'address_complement'), ''), NULLIF(BTRIM(_payload->>'neighborhood'), ''),
      NULLIF(BTRIM(_payload->>'marital_status'), ''), NULLIF(BTRIM(_payload->>'education'), ''),
      NULLIF(BTRIM(_payload->>'occupation'), ''), 'manual'
    ) RETURNING id INTO result_patient_id;
  ELSE
    UPDATE public.patients p SET
      full_name = BTRIM(_payload->>'full_name'),
      age_group = (_payload->>'age_group')::public.age_group,
      birth_date = (_payload->>'birth_date')::date,
      gender = NULLIF(BTRIM(_payload->>'gender'), ''),
      phone = NULLIF(BTRIM(_payload->>'phone'), ''),
      email = lower(BTRIM(_payload->>'email')),
      address = concat_ws(', ', NULLIF(BTRIM(_payload->>'street'), ''), NULLIF(BTRIM(_payload->>'address_number'), ''), NULLIF(BTRIM(_payload->>'address_complement'), ''), NULLIF(BTRIM(_payload->>'neighborhood'), '')),
      city = BTRIM(_payload->>'city'), state = upper(BTRIM(_payload->>'state')),
      status = COALESCE(NULLIF(_payload->>'status', '')::public.patient_status, p.status),
      notes = NULLIF(BTRIM(_payload->>'notes'), ''), cpf = regexp_replace(_payload->>'cpf', '\D', '', 'g'),
      postal_code = regexp_replace(_payload->>'postal_code', '\D', '', 'g'),
      address_number = NULLIF(BTRIM(_payload->>'address_number'), ''),
      address_complement = NULLIF(BTRIM(_payload->>'address_complement'), ''),
      neighborhood = NULLIF(BTRIM(_payload->>'neighborhood'), ''), marital_status = NULLIF(BTRIM(_payload->>'marital_status'), ''),
      education = NULLIF(BTRIM(_payload->>'education'), ''), occupation = NULLIF(BTRIM(_payload->>'occupation'), '')
    WHERE p.id = _patient_id AND p.account_id = target_account_id
    RETURNING p.id INTO result_patient_id;
    IF result_patient_id IS NULL THEN RAISE EXCEPTION 'Paciente não encontrado.'; END IF;
  END IF;

  IF (_payload->>'age_group') <> 'adulto' AND NULLIF(BTRIM(_payload->>'guardian_name'), '') IS NOT NULL THEN
    SELECT g.id INTO guardian_id FROM public.guardians g
    WHERE g.patient_id = result_patient_id AND g.account_id = target_account_id AND g.is_primary
    ORDER BY g.created_at LIMIT 1;
    IF guardian_id IS NULL THEN
      INSERT INTO public.guardians(account_id, user_id, patient_id, full_name, relationship, phone, email, is_primary)
      VALUES(target_account_id, owner_user_id, result_patient_id, BTRIM(_payload->>'guardian_name'), NULLIF(BTRIM(_payload->>'guardian_relationship'), ''), NULLIF(BTRIM(_payload->>'guardian_phone'), ''), NULLIF(lower(BTRIM(_payload->>'guardian_email')), ''), true);
    ELSE
      UPDATE public.guardians SET full_name=BTRIM(_payload->>'guardian_name'), relationship=NULLIF(BTRIM(_payload->>'guardian_relationship'), ''), phone=NULLIF(BTRIM(_payload->>'guardian_phone'), ''), email=NULLIF(lower(BTRIM(_payload->>'guardian_email')), '') WHERE id=guardian_id;
    END IF;
  END IF;

  intake := jsonb_build_object(
    'motivo_busca', _payload->>'therapy_reason', 'terapia_anterior', _payload->>'previous_therapy',
    'detalhes_terapia_anterior', NULLIF(BTRIM(_payload->>'previous_therapy_details'), ''),
    'diagnostico_medico', _payload->>'medical_diagnosis', 'detalhes_diagnostico', NULLIF(BTRIM(_payload->>'medical_diagnosis_details'), ''),
    'uso_medicamento', _payload->>'medication_use', 'detalhes_medicamento', NULLIF(BTRIM(_payload->>'medication_details'), ''),
    'historico_familiar_saude_mental', _payload->>'family_mental_health', 'detalhes_historico_familiar', NULLIF(BTRIM(_payload->>'family_mental_health_details'), ''),
    'contato_emergencia', jsonb_build_object('nome',NULLIF(BTRIM(_payload->>'emergency_name'), ''),'vinculo',NULLIF(BTRIM(_payload->>'emergency_relationship'), ''),'telefone',NULLIF(BTRIM(_payload->>'emergency_phone'), ''),'observacao',NULLIF(BTRIM(_payload->>'emergency_notes'), '')),
    'preferencia_pagamento', NULLIF(_payload->>'payment_preference', ''), 'origem', NULLIF(_payload->>'referral_source', ''), 'origem_outro', NULLIF(BTRIM(_payload->>'referral_source_other'), '')
  );

  IF is_new THEN
    INSERT INTO public.anamneses(account_id, user_id, patient_id, title, template_key, content, is_completed)
    VALUES(target_account_id, owner_user_id, result_patient_id, 'Informações iniciais do cadastro', 'patient_registration', intake, true);
  ELSE
    UPDATE public.anamneses SET content=intake, updated_at=now()
    WHERE id = (SELECT a.id FROM public.anamneses a WHERE a.patient_id=result_patient_id AND a.account_id=target_account_id AND a.template_key='patient_registration' ORDER BY a.created_at LIMIT 1);
    IF NOT FOUND THEN
      INSERT INTO public.anamneses(account_id, user_id, patient_id, title, template_key, content, is_completed)
      VALUES(target_account_id, owner_user_id, result_patient_id, 'Informações iniciais do cadastro', 'patient_registration', intake, true);
    END IF;
  END IF;

  RETURN result_patient_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_complete_patient(JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_complete_patient(JSONB, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_patient_registration(_request_id UUID, _existing_patient_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_request public.patient_registration_requests%ROWTYPE;
  result_patient_id UUID;
  owner_user_id UUID;
  duplicate_count INTEGER;
  intake JSONB;
BEGIN
  SELECT * INTO target_request FROM public.patient_registration_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_account_member(target_request.account_id) THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  IF target_request.status <> 'awaiting_approval' THEN RAISE EXCEPTION 'Esta solicitação já foi revisada.'; END IF;
  SELECT a.owner_user_id INTO owner_user_id FROM public.accounts a WHERE a.id = target_request.account_id;
  SELECT count(*) INTO duplicate_count FROM public.patients p WHERE p.account_id = target_request.account_id AND (regexp_replace(COALESCE(p.cpf,''), '\D', '', 'g') = regexp_replace(target_request.cpf, '\D', '', 'g') OR (p.email IS NOT NULL AND lower(p.email) = lower(target_request.email)) OR (lower(p.full_name) = lower(target_request.full_name) AND p.birth_date = target_request.birth_date));
  IF _existing_patient_id IS NULL AND duplicate_count > 0 THEN RAISE EXCEPTION 'Já encontramos um cadastro semelhante. Revise antes de aprovar.'; END IF;

  IF _existing_patient_id IS NOT NULL THEN
    SELECT p.id INTO result_patient_id FROM public.patients p WHERE p.id = _existing_patient_id AND p.account_id = target_request.account_id FOR UPDATE;
    IF result_patient_id IS NULL THEN RAISE EXCEPTION 'Paciente existente não encontrado.'; END IF;
    UPDATE public.patients p SET
      birth_date=COALESCE(p.birth_date,target_request.birth_date), gender=COALESCE(p.gender,NULLIF(target_request.gender,'')), phone=COALESCE(p.phone,NULLIF(target_request.phone,'')), email=COALESCE(p.email,NULLIF(target_request.email,'')),
      address=COALESCE(p.address,NULLIF(concat_ws(', ',NULLIF(target_request.street,''),NULLIF(target_request.address_number,''),NULLIF(target_request.address_complement,''),NULLIF(target_request.neighborhood,'')),'')), city=COALESCE(p.city,NULLIF(target_request.city,'')), state=COALESCE(p.state,NULLIF(target_request.state,'')),
      cpf=COALESCE(p.cpf,NULLIF(target_request.cpf,'')), postal_code=COALESCE(p.postal_code,NULLIF(target_request.postal_code,'')), address_number=COALESCE(p.address_number,NULLIF(target_request.address_number,'')), address_complement=COALESCE(p.address_complement,NULLIF(target_request.address_complement,'')), neighborhood=COALESCE(p.neighborhood,NULLIF(target_request.neighborhood,'')), marital_status=COALESCE(p.marital_status,NULLIF(target_request.marital_status,'')), education=COALESCE(p.education,NULLIF(target_request.education,'')), occupation=COALESCE(p.occupation,NULLIF(target_request.occupation,''))
    WHERE p.id=result_patient_id;
  ELSE
    INSERT INTO public.patients(account_id,user_id,full_name,age_group,birth_date,gender,phone,email,address,city,state,status,cpf,postal_code,address_number,address_complement,neighborhood,marital_status,education,occupation,registration_source)
    VALUES(target_request.account_id,owner_user_id,target_request.full_name,target_request.age_group,target_request.birth_date,target_request.gender,target_request.phone,target_request.email,concat_ws(', ',NULLIF(target_request.street,''),NULLIF(target_request.address_number,''),NULLIF(target_request.address_complement,''),NULLIF(target_request.neighborhood,'')),target_request.city,target_request.state,'avaliacao',target_request.cpf,target_request.postal_code,target_request.address_number,target_request.address_complement,target_request.neighborhood,target_request.marital_status,target_request.education,target_request.occupation,'pre_registration_link') RETURNING id INTO result_patient_id;
  END IF;

  IF target_request.age_group <> 'adulto' AND target_request.guardian_name IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.guardians g WHERE g.patient_id=result_patient_id AND g.account_id=target_request.account_id) THEN
    INSERT INTO public.guardians(account_id,user_id,patient_id,full_name,relationship,phone,email) VALUES(target_request.account_id,owner_user_id,result_patient_id,target_request.guardian_name,target_request.guardian_relationship,target_request.guardian_phone,target_request.guardian_email);
  END IF;
  intake := jsonb_build_object('motivo_busca',target_request.therapy_reason,'terapia_anterior',target_request.previous_therapy,'detalhes_terapia_anterior',target_request.previous_therapy_details,'diagnostico_medico',target_request.medical_diagnosis,'detalhes_diagnostico',target_request.medical_diagnosis_details,'uso_medicamento',target_request.medication_use,'detalhes_medicamento',target_request.medication_details,'historico_familiar_saude_mental',target_request.family_mental_health,'detalhes_historico_familiar',target_request.family_mental_health_details,'contato_emergencia',jsonb_build_object('nome',target_request.emergency_name,'vinculo',target_request.emergency_relationship,'telefone',target_request.emergency_phone,'observacao',target_request.emergency_notes),'preferencia_pagamento',target_request.payment_preference,'origem',target_request.referral_source,'origem_outro',target_request.referral_source_other);
  INSERT INTO public.anamneses(account_id,user_id,patient_id,title,template_key,content,is_completed) VALUES(target_request.account_id,owner_user_id,result_patient_id,'Informações do pré-cadastro','pre_registration',intake,true);
  UPDATE public.patient_registration_requests SET status='approved',patient_id=result_patient_id,reviewed_by=auth.uid(),reviewed_at=now(),approved_at=now(),rejection_reason=NULL WHERE id=_request_id;
  RETURN result_patient_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_patient_registration(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_patient_registration(UUID, UUID) TO authenticated, service_role;