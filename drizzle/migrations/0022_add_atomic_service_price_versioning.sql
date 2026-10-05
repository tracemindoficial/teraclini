CREATE OR REPLACE FUNCTION public.save_service_price(
  _price_id UUID,
  _appointment_type_id UUID,
  _price_cents INTEGER,
  _duration_minutes INTEGER,
  _modality TEXT,
  _billing_type TEXT,
  _package_quantity INTEGER,
  _is_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_account_id UUID;
  existing_price public.service_prices%ROWTYPE;
  result_id UUID;
BEGIN
  target_account_id := public.current_account_id();
  IF target_account_id IS NULL OR NOT public.is_account_member(target_account_id) THEN RAISE EXCEPTION 'Conta profissional não encontrada.'; END IF;
  IF _price_cents < 0 OR _duration_minutes < 5 OR _duration_minutes > 720 THEN RAISE EXCEPTION 'Revise o valor e a duração.'; END IF;
  IF _modality NOT IN ('presencial','online','hibrido','todas') OR _billing_type NOT IN ('avulso','pacote') THEN RAISE EXCEPTION 'Configuração de valor inválida.'; END IF;
  IF (_billing_type = 'pacote' AND COALESCE(_package_quantity, 0) < 1) OR (_billing_type = 'avulso' AND _package_quantity IS NOT NULL) THEN RAISE EXCEPTION 'Revise a quantidade do pacote.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.appointment_types WHERE id = _appointment_type_id AND account_id = target_account_id) THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;

  IF _price_id IS NULL THEN
    INSERT INTO public.service_prices (account_id, appointment_type_id, price_cents, duration_minutes, modality, billing_type, package_quantity, is_active)
    VALUES (target_account_id, _appointment_type_id, _price_cents, _duration_minutes, _modality, _billing_type, _package_quantity, _is_active)
    RETURNING id INTO result_id;
    RETURN result_id;
  END IF;

  SELECT * INTO existing_price FROM public.service_prices WHERE id = _price_id AND account_id = target_account_id FOR UPDATE;
  IF existing_price.id IS NULL THEN RAISE EXCEPTION 'Valor não encontrado.'; END IF;

  IF existing_price.appointment_type_id = _appointment_type_id
     AND existing_price.price_cents = _price_cents
     AND existing_price.duration_minutes = _duration_minutes
     AND existing_price.modality = _modality
     AND existing_price.billing_type = _billing_type
     AND existing_price.package_quantity IS NOT DISTINCT FROM _package_quantity THEN
    UPDATE public.service_prices SET is_active = _is_active WHERE id = existing_price.id;
    RETURN existing_price.id;
  END IF;

  UPDATE public.service_prices SET is_active = false WHERE id = existing_price.id;
  INSERT INTO public.service_prices (account_id, appointment_type_id, price_cents, duration_minutes, modality, billing_type, package_quantity, is_active, parent_price_id)
  VALUES (target_account_id, _appointment_type_id, _price_cents, _duration_minutes, _modality, _billing_type, _package_quantity, _is_active, existing_price.id)
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_service_price(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_service_price(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT, INTEGER, BOOLEAN) TO authenticated, service_role;
COMMENT ON FUNCTION public.save_service_price(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT, INTEGER, BOOLEAN) IS 'Atomically versions economic price changes while preserving historical references.';