DROP POLICY "Professionals read own support messages" ON public.support_messages;
CREATE POLICY "Professionals read own support messages" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.support_tickets ticket WHERE ticket.id = ticket_id AND ticket.user_id = auth.uid() AND ticket.account_id = account_id AND public.is_account_member(ticket.account_id)));

ALTER TYPE public.platform_admin_role ADD VALUE IF NOT EXISTS 'support_admin';
ALTER TYPE public.platform_admin_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE public.platform_admin_role ADD VALUE IF NOT EXISTS 'finance_admin';
ALTER TYPE public.platform_admin_role ADD VALUE IF NOT EXISTS 'content_admin';

ALTER TYPE public.help_event_type ADD VALUE IF NOT EXISTS 'support_view';

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

COMMENT ON TYPE public.platform_admin_role IS 'Platform roles are additive to the professional account role and can only be managed by privileged server functions.';