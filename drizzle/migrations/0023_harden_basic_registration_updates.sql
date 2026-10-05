CREATE OR REPLACE FUNCTION public.set_profile_specialties(
  _profile_id UUID,
  _specialty_ids UUID[],
  _primary_specialty_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_account_id UUID;
BEGIN
  SELECT account_id INTO target_account_id
  FROM public.profiles
  WHERE id = _profile_id;

  IF target_account_id IS NULL OR NOT public.is_account_member(target_account_id) THEN
    RAISE EXCEPTION 'Perfil profissional não encontrado.';
  END IF;
  IF _primary_specialty_id IS NULL OR NOT (_primary_specialty_id = ANY(_specialty_ids)) THEN
    RAISE EXCEPTION 'Selecione uma especialidade principal.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_specialty_ids) AS selected_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.specialties
      WHERE id = selected_id AND account_id = target_account_id AND is_active
    )
  ) THEN
    RAISE EXCEPTION 'Especialidade inválida para esta conta.';
  END IF;

  DELETE FROM public.profile_specialties
  WHERE profile_id = _profile_id;

  INSERT INTO public.profile_specialties (account_id, profile_id, specialty_id, is_primary)
  SELECT target_account_id, _profile_id, selected_id, selected_id = _primary_specialty_id
  FROM unnest(_specialty_ids) AS selected_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_profile_specialties(UUID, UUID[], UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_specialties(UUID, UUID[], UUID) TO authenticated, service_role;
COMMENT ON FUNCTION public.set_profile_specialties(UUID, UUID[], UUID) IS 'Atomically replaces the professional specialty selection after validating account ownership.';

REVOKE DELETE ON public.specialties FROM authenticated;
REVOKE DELETE ON public.appointment_types FROM authenticated;
REVOKE DELETE ON public.service_prices FROM authenticated;
COMMENT ON TABLE public.specialties IS 'Account-scoped reusable professional specialties; authenticated users deactivate rows instead of deleting them.';
COMMENT ON TABLE public.appointment_types IS 'Account-scoped reusable services; authenticated users deactivate rows instead of deleting them.';
COMMENT ON TABLE public.service_prices IS 'Versioned account-scoped price offers in integer Brazilian real cents; authenticated users deactivate rows instead of deleting them.';

ALTER TABLE public.care_packages ADD COLUMN service_name_snapshot TEXT;
UPDATE public.care_packages p
SET service_name_snapshot = a.name
FROM public.appointment_types a
WHERE p.appointment_type_id = a.id
  AND p.service_name_snapshot IS NULL;

CREATE OR REPLACE FUNCTION public.snapshot_care_package_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  selected_price public.service_prices%ROWTYPE;
  selected_service public.appointment_types%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.lifecycle_status IN ('encerrado', 'cancelado') AND (
    NEW.appointment_type_id IS DISTINCT FROM OLD.appointment_type_id OR
    NEW.service_price_id IS DISTINCT FROM OLD.service_price_id OR
    NEW.service_name_snapshot IS DISTINCT FROM OLD.service_name_snapshot OR
    NEW.total_value_cents IS DISTINCT FROM OLD.total_value_cents OR
    NEW.value_per_session_cents IS DISTINCT FROM OLD.value_per_session_cents
  ) THEN
    RAISE EXCEPTION 'O serviço e o valor de um pacote encerrado não podem ser alterados.';
  END IF;

  IF NEW.service_price_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.service_price_id IS DISTINCT FROM OLD.service_price_id) THEN
    SELECT * INTO selected_price FROM public.service_prices WHERE id = NEW.service_price_id AND account_id = NEW.account_id;
    IF selected_price.id IS NULL OR selected_price.billing_type <> 'pacote' THEN RAISE EXCEPTION 'Valor de pacote inválido para esta conta.'; END IF;
    NEW.appointment_type_id := selected_price.appointment_type_id;
    NEW.quantity := selected_price.package_quantity;
    NEW.total_value_cents := selected_price.price_cents;
    NEW.value_per_session_cents := ROUND(selected_price.price_cents::numeric / selected_price.package_quantity)::integer;
    NEW.total_value := selected_price.price_cents::numeric / 100;
    NEW.value_per_session := ROUND((selected_price.price_cents::numeric / selected_price.package_quantity) / 100, 2);
  ELSIF NEW.total_value_cents IS NOT NULL THEN
    NEW.total_value := NEW.total_value_cents::numeric / 100;
    NEW.value_per_session_cents := ROUND(NEW.total_value_cents::numeric / NEW.quantity)::integer;
    NEW.value_per_session := ROUND((NEW.total_value_cents::numeric / NEW.quantity) / 100, 2);
  END IF;

  IF NEW.appointment_type_id IS NOT NULL AND (NEW.service_name_snapshot IS NULL OR TG_OP = 'INSERT') THEN
    SELECT * INTO selected_service FROM public.appointment_types WHERE id = NEW.appointment_type_id AND account_id = NEW.account_id;
    IF selected_service.id IS NULL THEN RAISE EXCEPTION 'Serviço inválido para esta conta.'; END IF;
    NEW.service_name_snapshot := selected_service.name;
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON COLUMN public.care_packages.service_name_snapshot IS 'Immutable display name captured from the selected service for historical package views.';