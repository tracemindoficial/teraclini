ALTER FUNCTION public.patient_registration_duplicates(UUID) SECURITY DEFINER;
ALTER FUNCTION public.approve_patient_registration(UUID, UUID) SECURITY DEFINER;
ALTER FUNCTION public.reject_patient_registration(UUID, TEXT) SECURITY DEFINER;