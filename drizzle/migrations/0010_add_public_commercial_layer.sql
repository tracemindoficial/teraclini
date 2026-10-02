CREATE TABLE public.commercial_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('landing_view', 'plans_view', 'signup_click', 'login_click', 'plan_select')),
  plan_code TEXT,
  page_path TEXT NOT NULL CHECK (page_path IN ('/', '/planos', '/auth')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (plan_code IS NULL OR (char_length(plan_code) BETWEEN 1 AND 80 AND plan_code ~ '^[a-zA-Z0-9_-]+$'))
);
GRANT INSERT ON public.commercial_conversion_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_conversion_events TO service_role;
ALTER TABLE public.commercial_conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can record constrained commercial events"
ON public.commercial_conversion_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IN ('landing_view', 'plans_view', 'signup_click', 'login_click', 'plan_select')
  AND page_path IN ('/', '/planos', '/auth')
  AND (plan_code IS NULL OR (char_length(plan_code) BETWEEN 1 AND 80 AND plan_code ~ '^[a-zA-Z0-9_-]+$'))
);
CREATE INDEX commercial_conversion_events_type_time_idx
ON public.commercial_conversion_events(event_type, occurred_at DESC);

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
CREATE POLICY "Public can view active subscription plans"
ON public.subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);