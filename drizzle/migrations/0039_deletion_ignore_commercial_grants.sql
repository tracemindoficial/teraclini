DO $m$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.admin_client_dependency_counts'::regproc);
  def := replace(def, '''onboarding_tasks'',''profiles''', '''onboarding_tasks'',''access_grants'',''access_grant_events'',''profiles''');
  EXECUTE def;
END $m$;