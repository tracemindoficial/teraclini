import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, unwrap, type Guardian, type Patient, type Tables } from "./shared";
import { queryKeys } from "@/lib/query-keys";
import { saveCompletePatient } from "@/lib/patient-registration.functions";
import type { ProfessionalPatientPayload } from "@/lib/patient-registration-schema";

export function usePatients(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.patients, search ?? ""],
    queryFn: async () => {
      let query = supabase.from("patients").select("*").order("full_name");
      if (search && search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);
      return unwrap(await query) as Patient[];
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: queryKeys.patient(id),
    queryFn: async () =>
      unwrap(await supabase.from("patients").select("*").eq("id", id).single()) as Patient,
  });
}

export function useSavePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["patients"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      const result = await supabase
        .from("patients")
        .upsert({ ...values, user_id: userId })
        .select()
        .single();
      return unwrap(result) as Patient;
    },
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: queryKeys.patients });
      qc.invalidateQueries({ queryKey: queryKeys.patient(patient.id) });
      qc.invalidateQueries({ queryKey: queryKeys.onboardingTasks });
    },
  });
}

export function useSaveCompletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, payload }: { patientId?: string | undefined; payload: ProfessionalPatientPayload }) =>
      saveCompletePatient({ data: patientId ? { patientId, payload } : { payload } }),
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: queryKeys.patients });
      qc.invalidateQueries({ queryKey: queryKeys.patient(patient.id) });
      qc.invalidateQueries({ queryKey: queryKeys.guardians(patient.id) });
      qc.invalidateQueries({ queryKey: queryKeys.anamneses(patient.id) });
      qc.invalidateQueries({ queryKey: queryKeys.onboardingTasks });
    },
  });
}

export function useGuardians(patientId: string) {
  return useQuery({
    queryKey: queryKeys.guardians(patientId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("guardians")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at"),
      ) as Guardian[],
    enabled: Boolean(patientId),
  });
}

export function useSaveGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Omit<Tables["guardians"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase
          .from("guardians")
          .upsert({ ...values, user_id: userId })
          .select()
          .single(),
      ) as Guardian;
    },
    onSuccess: (guardian) =>
      qc.invalidateQueries({ queryKey: queryKeys.guardians(guardian.patient_id) }),
  });
}

export function useDeleteGuardian(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guardians").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.guardians(patientId) }),
  });
}
