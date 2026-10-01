REVOKE ALL ON FUNCTION public.record_care_package_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_care_package_event() FROM anon;
REVOKE ALL ON FUNCTION public.record_care_package_event() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_care_package_event() TO service_role;