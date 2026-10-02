CREATE TYPE public.platform_admin_role AS ENUM ('super_admin');
CREATE TYPE public.subscription_status AS ENUM ('awaiting_first_payment', 'active', 'payment_pending', 'grace_period', 'restricted', 'cancellation_requested', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'under_review', 'confirmed', 'rejected', 'overdue', 'refunded', 'cancelled');

CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role public.platform_admin_role NOT NULL DEFAULT 'super_admin',
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  billing_interval_months INTEGER NOT NULL DEFAULT 1 CHECK (billing_interval_months > 0),
  first_payment_days INTEGER NOT NULL DEFAULT 7 CHECK (first_payment_days >= 0),
  grace_period_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
  promotional_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  contracted_price_cents INTEGER NOT NULL CHECK (contracted_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  starts_on DATE NOT NULL,
  next_due_on DATE NOT NULL,
  billing_period DATE NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'awaiting_first_payment',
  cancellation_requested_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  restricted_at TIMESTAMPTZ,
  provider_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cancelled_at IS NULL OR cancellation_requested_at IS NOT NULL),
  CHECK (restricted_at IS NULL OR status = 'restricted')
);
GRANT ALL ON public.account_subscriptions TO service_role;
ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.account_subscriptions(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  previous_status public.subscription_status,
  new_status public.subscription_status,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES public.account_subscriptions(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  due_on DATE NOT NULL,
  billing_period DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  method TEXT NOT NULL DEFAULT 'pix' CHECK (method IN ('pix', 'other')),
  status public.payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  charge_id TEXT,
  confirmation_source TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'confirmed' OR (confirmed_at IS NOT NULL AND paid_at IS NOT NULL))
);
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX payments_transaction_id_unique ON public.payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX payments_charge_id_unique ON public.payments(charge_id) WHERE charge_id IS NOT NULL;
CREATE UNIQUE INDEX payments_subscription_period_unique ON public.payments(subscription_id, billing_period);

CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  previous_status public.payment_status,
  new_status public.payment_status,
  amount_cents INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  author_user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_notes TO service_role;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failure')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_audit_events TO service_role;
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.commercial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.commercial_settings TO service_role;
ALTER TABLE public.commercial_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('session', 'dashboard', 'agenda', 'patients', 'appointments', 'documents', 'packages', 'reports', 'settings')),
  action TEXT NOT NULL CHECK (char_length(action) BETWEEN 1 AND 80),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX account_subscriptions_status_due_idx ON public.account_subscriptions(status, next_due_on);
CREATE INDEX subscription_events_subscription_created_idx ON public.subscription_events(subscription_id, created_at DESC);
CREATE INDEX payments_status_due_idx ON public.payments(status, due_on);
CREATE INDEX payments_account_created_idx ON public.payments(account_id, created_at DESC);
CREATE INDEX payment_events_payment_created_idx ON public.payment_events(payment_id, created_at DESC);
CREATE INDEX admin_notes_account_created_idx ON public.admin_notes(account_id, created_at DESC);
CREATE INDEX platform_audit_events_created_idx ON public.platform_audit_events(created_at DESC);
CREATE INDEX platform_audit_events_account_idx ON public.platform_audit_events(account_id, created_at DESC);
CREATE INDEX usage_events_occurred_idx ON public.usage_events(occurred_at DESC);
CREATE INDEX usage_events_account_occurred_idx ON public.usage_events(account_id, occurred_at DESC);

CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER account_subscriptions_updated_at BEFORE UPDATE ON public.account_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admin_notes_updated_at BEFORE UPDATE ON public.admin_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER commercial_settings_updated_at BEFORE UPDATE ON public.commercial_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.platform_admins IS 'Global platform operators; grants are service-role only and never self-service.';
COMMENT ON TABLE public.platform_audit_events IS 'Immutable administrative audit trail without clinical content or secrets.';
COMMENT ON TABLE public.usage_events IS 'Minimal technical usage telemetry; never stores clinical content or patient identifiers.';