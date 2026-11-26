-- Corrige a publicação da oferta comercial do Plano Completo
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-11-26T16:07:19.010Z

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS reference_price_cents integer
  CHECK (reference_price_cents IS NULL OR reference_price_cents > price_cents);

-- Seed only the already approved offer; never overwrite an edited offer.
DO $offer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'admin_update_public_offer') THEN
    UPDATE public.subscription_plans
    SET reference_price_cents = 12000
    WHERE code = 'teraclini_mensal' AND currency = 'BRL' AND billing_interval_months = 1
      AND price_cents = 6700 AND reference_price_cents IS NULL;
  END IF;
END;
$offer$;

CREATE OR REPLACE FUNCTION public.admin_update_public_offer(
  _actor_user_id uuid,
  _price_cents integer,
  _reference_price_cents integer,
  _is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  previous public.subscription_plans%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN public.accounts a ON a.owner_user_id = pa.user_id
    WHERE pa.user_id = _actor_user_id AND pa.role = 'super_admin'
      AND pa.revoked_at IS NULL AND a.status = 'active' AND a.blocked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE = '42501';
  END IF;
  IF _price_cents IS NULL OR _price_cents <= 0 OR _is_active IS NULL
    OR (_reference_price_cents IS NOT NULL AND _reference_price_cents <= _price_cents) THEN
    RAISE EXCEPTION 'Valores da oferta inválidos' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO STRICT previous FROM public.subscription_plans
    WHERE code = 'teraclini_mensal' AND currency = 'BRL' AND billing_interval_months = 1
    FOR UPDATE;
  IF ROW(previous.price_cents, previous.reference_price_cents, previous.is_active)
      IS NOT DISTINCT FROM ROW(_price_cents, _reference_price_cents, _is_active) THEN
    RETURN;
  END IF;
  UPDATE public.subscription_plans
  SET price_cents = _price_cents, reference_price_cents = _reference_price_cents, is_active = _is_active
  WHERE id = previous.id;
  INSERT INTO public.platform_audit_events (actor_user_id, action, entity_type, entity_id, changed_fields, details)
  VALUES (_actor_user_id, 'offer.update', 'subscription_plan', previous.id,
    array_remove(ARRAY[
      CASE WHEN previous.price_cents IS DISTINCT FROM _price_cents THEN 'price_cents' END,
      CASE WHEN previous.reference_price_cents IS DISTINCT FROM _reference_price_cents THEN 'reference_price_cents' END,
      CASE WHEN previous.is_active IS DISTINCT FROM _is_active THEN 'is_active' END
    ]::text[], NULL),
    jsonb_build_object(
      'previous', jsonb_build_object('price_cents', previous.price_cents, 'reference_price_cents', previous.reference_price_cents, 'is_active', previous.is_active),
      'current', jsonb_build_object('price_cents', _price_cents, 'reference_price_cents', _reference_price_cents, 'is_active', _is_active)
    ));
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_public_offer(uuid, integer, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_public_offer(uuid, integer, integer, boolean) TO service_role;
