ALTER FUNCTION public.is_platform_admin() SECURITY INVOKER;
ALTER FUNCTION public.is_platform_admin() SET search_path = public;

COMMENT ON FUNCTION public.is_platform_admin() IS 'Compatibility helper using caller permissions; platform authorization remains enforced by authenticated server functions.';