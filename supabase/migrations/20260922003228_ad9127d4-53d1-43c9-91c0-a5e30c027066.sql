CREATE OR REPLACE FUNCTION public.complete_onboarding_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_name TEXT;
  target_account UUID;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NOT NEW.onboarding_completed THEN RETURN NEW; END IF;
    task_name := 'profile';
  ELSIF TG_TABLE_NAME = 'locations' THEN
    task_name := 'location';
  ELSIF TG_TABLE_NAME = 'patients' THEN
    task_name := 'patient';
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    task_name := 'appointment';
  ELSE
    RETURN NEW;
  END IF;

  target_account := NEW.account_id;
  INSERT INTO public.onboarding_tasks (account_id, task_key, completed_at)
  VALUES (target_account, task_name, now())
  ON CONFLICT (account_id, task_key)
  DO UPDATE SET completed_at = COALESCE(public.onboarding_tasks.completed_at, EXCLUDED.completed_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER complete_profile_onboarding_task
AFTER INSERT OR UPDATE OF onboarding_completed ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_task();
CREATE TRIGGER complete_location_onboarding_task
AFTER INSERT ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_task();
CREATE TRIGGER complete_patient_onboarding_task
AFTER INSERT ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_task();
CREATE TRIGGER complete_appointment_onboarding_task
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_task();

REVOKE ALL ON FUNCTION public.complete_onboarding_task() FROM PUBLIC, anon, authenticated;