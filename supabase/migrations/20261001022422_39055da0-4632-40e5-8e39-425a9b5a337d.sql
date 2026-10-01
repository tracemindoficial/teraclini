CREATE TABLE public.patient_registration_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL DEFAULT public.current_account_id() REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  label TEXT CHECK (label IS NULL OR char_length(label) <= 120),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 50),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_registration_links TO authenticated;
GRANT ALL ON public.patient_registration_links TO service_role;
ALTER TABLE public.patient_registration_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members manage registration links" ON public.patient_registration_links
FOR ALL TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));

CREATE TABLE public.patient_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.patient_registration_links(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval','approved','rejected')),
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 150),
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  birth_date DATE NOT NULL,
  cpf TEXT NOT NULL CHECK (char_length(cpf) <= 14),
  age_group public.age_group NOT NULL DEFAULT 'adulto',
  gender TEXT CHECK (gender IS NULL OR char_length(gender) <= 80),
  marital_status TEXT CHECK (marital_status IS NULL OR char_length(marital_status) <= 80),
  education TEXT CHECK (education IS NULL OR char_length(education) <= 120),
  occupation TEXT CHECK (occupation IS NULL OR char_length(occupation) <= 120),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
  postal_code TEXT NOT NULL CHECK (char_length(postal_code) <= 9),
  street TEXT CHECK (street IS NULL OR char_length(street) <= 180),
  address_number TEXT CHECK (address_number IS NULL OR char_length(address_number) <= 20),
  address_complement TEXT CHECK (address_complement IS NULL OR char_length(address_complement) <= 120),
  neighborhood TEXT CHECK (neighborhood IS NULL OR char_length(neighborhood) <= 120),
  city TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 120),
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  guardian_name TEXT CHECK (guardian_name IS NULL OR char_length(guardian_name) <= 150),
  guardian_relationship TEXT CHECK (guardian_relationship IS NULL OR char_length(guardian_relationship) <= 80),
  guardian_phone TEXT CHECK (guardian_phone IS NULL OR char_length(guardian_phone) <= 30),
  guardian_email TEXT CHECK (guardian_email IS NULL OR char_length(guardian_email) <= 254),
  emergency_name TEXT CHECK (emergency_name IS NULL OR char_length(emergency_name) <= 150),
  emergency_relationship TEXT CHECK (emergency_relationship IS NULL OR char_length(emergency_relationship) <= 80),
  emergency_phone TEXT CHECK (emergency_phone IS NULL OR char_length(emergency_phone) <= 30),
  emergency_notes TEXT CHECK (emergency_notes IS NULL OR char_length(emergency_notes) <= 500),
  therapy_reason TEXT NOT NULL CHECK (char_length(therapy_reason) BETWEEN 3 AND 3000),
  previous_therapy TEXT NOT NULL CHECK (previous_therapy IN ('sim','nao','prefiro_nao_informar')),
  previous_therapy_details TEXT CHECK (previous_therapy_details IS NULL OR char_length(previous_therapy_details) <= 3000),
  medical_diagnosis TEXT NOT NULL CHECK (medical_diagnosis IN ('sim','nao','prefiro_nao_informar')),
  medical_diagnosis_details TEXT CHECK (medical_diagnosis_details IS NULL OR char_length(medical_diagnosis_details) <= 3000),
  medication_use TEXT NOT NULL CHECK (medication_use IN ('sim','nao','prefiro_nao_informar')),
  medication_details TEXT CHECK (medication_details IS NULL OR char_length(medication_details) <= 3000),
  family_mental_health TEXT NOT NULL CHECK (family_mental_health IN ('sim','nao','nao_sei','prefiro_nao_informar')),
  family_mental_health_details TEXT CHECK (family_mental_health_details IS NULL OR char_length(family_mental_health_details) <= 3000),
  payment_preference TEXT CHECK (payment_preference IS NULL OR payment_preference IN ('dinheiro','pix','cartao')),
  referral_source TEXT CHECK (referral_source IS NULL OR referral_source IN ('indicacao','outro_profissional','anuncio','instagram','google','facebook','outro')),
  referral_source_other TEXT CHECK (referral_source_other IS NULL OR char_length(referral_source_other) <= 180),
  privacy_consent_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 1000),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.patient_registration_requests TO authenticated;
GRANT ALL ON public.patient_registration_requests TO service_role;
ALTER TABLE public.patient_registration_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members read registration requests" ON public.patient_registration_requests
FOR SELECT TO authenticated USING (public.is_account_member(account_id));
CREATE POLICY "account members update registration requests" ON public.patient_registration_requests
FOR UPDATE TO authenticated USING (public.is_account_member(account_id)) WITH CHECK (public.is_account_member(account_id));

CREATE TABLE public.patient_registration_rate_limits (
  bucket_key TEXT PRIMARY KEY CHECK (char_length(bucket_key) = 64),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.patient_registration_rate_limits TO service_role;
ALTER TABLE public.patient_registration_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages registration limits" ON public.patient_registration_rate_limits
FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.patients
  ADD COLUMN cpf TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN address_number TEXT,
  ADD COLUMN address_complement TEXT,
  ADD COLUMN neighborhood TEXT,
  ADD COLUMN marital_status TEXT,
  ADD COLUMN education TEXT,
  ADD COLUMN occupation TEXT,
  ADD COLUMN registration_source TEXT NOT NULL DEFAULT 'manual' CHECK (registration_source IN ('manual','pre_registration_link'));

CREATE INDEX patient_registration_links_account_idx ON public.patient_registration_links(account_id, created_at DESC);
CREATE INDEX patient_registration_requests_account_status_idx ON public.patient_registration_requests(account_id, status, submitted_at DESC);
CREATE INDEX patient_registration_requests_link_idx ON public.patient_registration_requests(link_id);
CREATE INDEX patient_registration_requests_cpf_idx ON public.patient_registration_requests(account_id, (regexp_replace(cpf, '\D', '', 'g')));
CREATE INDEX patients_account_cpf_idx ON public.patients(account_id, (regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')));
CREATE INDEX patients_account_email_idx ON public.patients(account_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX patients_account_identity_idx ON public.patients(account_id, lower(full_name), birth_date);

CREATE TRIGGER patient_registration_links_updated_at BEFORE UPDATE ON public.patient_registration_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER patient_registration_requests_updated_at BEFORE UPDATE ON public.patient_registration_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.submit_patient_registration(
  _token_hash TEXT,
  _bucket_key TEXT,
  _payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_link public.patient_registration_links%ROWTYPE;
  request_id UUID;
  limiter public.patient_registration_rate_limits%ROWTYPE;
BEGIN
  IF char_length(_token_hash) <> 64 OR char_length(_bucket_key) <> 64 THEN
    RAISE EXCEPTION 'Este link não está mais disponível.';
  END IF;

  SELECT * INTO target_link
  FROM public.patient_registration_links
  WHERE token_hash = _token_hash
  FOR UPDATE;

  IF NOT FOUND OR target_link.revoked_at IS NOT NULL OR target_link.expires_at <= now() OR target_link.uses_count >= target_link.max_uses THEN
    RAISE EXCEPTION 'Este link não está mais disponível.';
  END IF;

  SELECT * INTO limiter FROM public.patient_registration_rate_limits WHERE bucket_key = _bucket_key FOR UPDATE;
  IF FOUND AND limiter.window_started_at > now() - interval '1 hour' AND limiter.attempts >= 10 THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde antes de tentar novamente.';
  END IF;
  IF NOT FOUND OR limiter.window_started_at <= now() - interval '1 hour' THEN
    INSERT INTO public.patient_registration_rate_limits(bucket_key, window_started_at, attempts)
    VALUES (_bucket_key, now(), 1)
    ON CONFLICT (bucket_key) DO UPDATE SET window_started_at = now(), attempts = 1, updated_at = now();
  ELSE
    UPDATE public.patient_registration_rate_limits SET attempts = attempts + 1, updated_at = now() WHERE bucket_key = _bucket_key;
  END IF;

  INSERT INTO public.patient_registration_requests (
    account_id, link_id, full_name, email, birth_date, cpf, age_group, gender, marital_status, education, occupation,
    phone, postal_code, street, address_number, address_complement, neighborhood, city, state,
    guardian_name, guardian_relationship, guardian_phone, guardian_email,
    emergency_name, emergency_relationship, emergency_phone, emergency_notes,
    therapy_reason, previous_therapy, previous_therapy_details, medical_diagnosis, medical_diagnosis_details,
    medication_use, medication_details, family_mental_health, family_mental_health_details,
    payment_preference, referral_source, referral_source_other, privacy_consent_at
  ) VALUES (
    target_link.account_id, target_link.id,
    BTRIM(_payload->>'full_name'), lower(BTRIM(_payload->>'email')), (_payload->>'birth_date')::date,
    regexp_replace(_payload->>'cpf', '\D', '', 'g'), (_payload->>'age_group')::public.age_group,
    NULLIF(BTRIM(_payload->>'gender'), ''), NULLIF(BTRIM(_payload->>'marital_status'), ''),
    NULLIF(BTRIM(_payload->>'education'), ''), NULLIF(BTRIM(_payload->>'occupation'), ''),
    NULLIF(BTRIM(_payload->>'phone'), ''), regexp_replace(_payload->>'postal_code', '\D', '', 'g'),
    NULLIF(BTRIM(_payload->>'street'), ''), NULLIF(BTRIM(_payload->>'address_number'), ''),
    NULLIF(BTRIM(_payload->>'address_complement'), ''), NULLIF(BTRIM(_payload->>'neighborhood'), ''),
    BTRIM(_payload->>'city'), upper(BTRIM(_payload->>'state')),
    NULLIF(BTRIM(_payload->>'guardian_name'), ''), NULLIF(BTRIM(_payload->>'guardian_relationship'), ''),
    NULLIF(BTRIM(_payload->>'guardian_phone'), ''), NULLIF(lower(BTRIM(_payload->>'guardian_email')), ''),
    NULLIF(BTRIM(_payload->>'emergency_name'), ''), NULLIF(BTRIM(_payload->>'emergency_relationship'), ''),
    NULLIF(BTRIM(_payload->>'emergency_phone'), ''), NULLIF(BTRIM(_payload->>'emergency_notes'), ''),
    BTRIM(_payload->>'therapy_reason'), _payload->>'previous_therapy', NULLIF(BTRIM(_payload->>'previous_therapy_details'), ''),
    _payload->>'medical_diagnosis', NULLIF(BTRIM(_payload->>'medical_diagnosis_details'), ''),
    _payload->>'medication_use', NULLIF(BTRIM(_payload->>'medication_details'), ''),
    _payload->>'family_mental_health', NULLIF(BTRIM(_payload->>'family_mental_health_details'), ''),
    NULLIF(_payload->>'payment_preference', ''), NULLIF(_payload->>'referral_source', ''),
    NULLIF(BTRIM(_payload->>'referral_source_other'), ''), now()
  ) RETURNING id INTO request_id;

  UPDATE public.patient_registration_links SET uses_count = uses_count + 1 WHERE id = target_link.id;
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_patient_registration(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_patient_registration(TEXT, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.patient_registration_duplicates(_request_id UUID)
RETURNS TABLE(id UUID, full_name TEXT, birth_date DATE, email TEXT, phone TEXT, reasons TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_request public.patient_registration_requests%ROWTYPE;
BEGIN
  SELECT * INTO target_request FROM public.patient_registration_requests WHERE patient_registration_requests.id = _request_id;
  IF NOT FOUND OR NOT public.is_account_member(target_request.account_id) THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.birth_date, p.email, p.phone,
    array_remove(ARRAY[
      CASE WHEN regexp_replace(COALESCE(p.cpf,''), '\D', '', 'g') = regexp_replace(target_request.cpf, '\D', '', 'g') THEN 'CPF' END,
      CASE WHEN p.email IS NOT NULL AND lower(p.email) = lower(target_request.email) THEN 'E-mail' END,
      CASE WHEN lower(p.full_name) = lower(target_request.full_name) AND p.birth_date = target_request.birth_date THEN 'Nome e nascimento' END
    ], NULL)
  FROM public.patients p
  WHERE p.account_id = target_request.account_id AND (
    regexp_replace(COALESCE(p.cpf,''), '\D', '', 'g') = regexp_replace(target_request.cpf, '\D', '', 'g')
    OR (p.email IS NOT NULL AND lower(p.email) = lower(target_request.email))
    OR (lower(p.full_name) = lower(target_request.full_name) AND p.birth_date = target_request.birth_date)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.patient_registration_duplicates(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patient_registration_duplicates(UUID) TO authenticated, service_role;

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

  SELECT count(*) INTO duplicate_count FROM public.patients p WHERE p.account_id = target_request.account_id AND (
    regexp_replace(COALESCE(p.cpf,''), '\D', '', 'g') = regexp_replace(target_request.cpf, '\D', '', 'g')
    OR (p.email IS NOT NULL AND lower(p.email) = lower(target_request.email))
    OR (lower(p.full_name) = lower(target_request.full_name) AND p.birth_date = target_request.birth_date)
  );

  IF _existing_patient_id IS NULL AND duplicate_count > 0 THEN
    RAISE EXCEPTION 'Já encontramos um cadastro semelhante. Revise antes de aprovar.';
  END IF;

  IF _existing_patient_id IS NOT NULL THEN
    SELECT p.id INTO result_patient_id FROM public.patients p WHERE p.id = _existing_patient_id AND p.account_id = target_request.account_id;
    IF result_patient_id IS NULL THEN RAISE EXCEPTION 'Paciente existente não encontrado.'; END IF;
  ELSE
    INSERT INTO public.patients (
      account_id, user_id, full_name, age_group, birth_date, gender, phone, email, address, city, state, status,
      cpf, postal_code, address_number, address_complement, neighborhood, marital_status, education, occupation, registration_source
    ) VALUES (
      target_request.account_id, owner_user_id, target_request.full_name, target_request.age_group, target_request.birth_date,
      target_request.gender, target_request.phone, target_request.email,
      concat_ws(', ', NULLIF(target_request.street,''), NULLIF(target_request.address_number,''), NULLIF(target_request.address_complement,''), NULLIF(target_request.neighborhood,'')),
      target_request.city, target_request.state, 'avaliacao', target_request.cpf, target_request.postal_code,
      target_request.address_number, target_request.address_complement, target_request.neighborhood,
      target_request.marital_status, target_request.education, target_request.occupation, 'pre_registration_link'
    ) RETURNING id INTO result_patient_id;

    IF target_request.age_group <> 'adulto' AND target_request.guardian_name IS NOT NULL THEN
      INSERT INTO public.guardians(account_id, user_id, patient_id, full_name, relationship, phone, email)
      VALUES(target_request.account_id, owner_user_id, result_patient_id, target_request.guardian_name,
        target_request.guardian_relationship, target_request.guardian_phone, target_request.guardian_email);
    END IF;
  END IF;

  intake := jsonb_build_object(
    'motivo_busca', target_request.therapy_reason,
    'terapia_anterior', target_request.previous_therapy,
    'detalhes_terapia_anterior', target_request.previous_therapy_details,
    'diagnostico_medico', target_request.medical_diagnosis,
    'detalhes_diagnostico', target_request.medical_diagnosis_details,
    'uso_medicamento', target_request.medication_use,
    'detalhes_medicamento', target_request.medication_details,
    'historico_familiar_saude_mental', target_request.family_mental_health,
    'detalhes_historico_familiar', target_request.family_mental_health_details,
    'contato_emergencia', jsonb_build_object('nome',target_request.emergency_name,'vinculo',target_request.emergency_relationship,'telefone',target_request.emergency_phone,'observacao',target_request.emergency_notes),
    'preferencia_pagamento', target_request.payment_preference,
    'origem', target_request.referral_source,
    'origem_outro', target_request.referral_source_other
  );

  INSERT INTO public.anamneses(account_id, user_id, patient_id, title, template_key, content, is_completed)
  VALUES(target_request.account_id, owner_user_id, result_patient_id, 'Informações do pré-cadastro', 'pre_registration', intake, true);

  UPDATE public.patient_registration_requests SET status = 'approved', patient_id = result_patient_id,
    reviewed_by = auth.uid(), reviewed_at = now(), approved_at = now(), rejection_reason = NULL
  WHERE id = _request_id;

  RETURN result_patient_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_patient_registration(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_patient_registration(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_patient_registration(_request_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_request public.patient_registration_requests%ROWTYPE;
BEGIN
  IF _reason IS NULL OR char_length(BTRIM(_reason)) < 3 OR char_length(_reason) > 1000 THEN RAISE EXCEPTION 'Informe o motivo da recusa.'; END IF;
  SELECT * INTO target_request FROM public.patient_registration_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_account_member(target_request.account_id) THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  IF target_request.status <> 'awaiting_approval' THEN RAISE EXCEPTION 'Esta solicitação já foi revisada.'; END IF;
  UPDATE public.patient_registration_requests SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejected_at = now(), rejection_reason = BTRIM(_reason) WHERE id = _request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reject_patient_registration(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_patient_registration(UUID, TEXT) TO authenticated, service_role;

CREATE TRIGGER audit_patient_registration_links AFTER INSERT OR UPDATE OR DELETE ON public.patient_registration_links
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();
CREATE TRIGGER audit_patient_registration_requests AFTER INSERT OR UPDATE OR DELETE ON public.patient_registration_requests
FOR EACH ROW EXECUTE FUNCTION public.record_safe_audit_event();