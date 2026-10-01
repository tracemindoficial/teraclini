ALTER FUNCTION public.patient_registration_duplicates(UUID) SECURITY INVOKER;
ALTER FUNCTION public.approve_patient_registration(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION public.reject_patient_registration(UUID, TEXT) SECURITY INVOKER;