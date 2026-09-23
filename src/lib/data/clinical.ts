import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, unwrap, type Anamnesis, type Evolution, type Tables } from "./shared";

export function useEvolutions(patientId: string) {
  return useQuery({
    queryKey: ["evolutions", patientId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("evolutions")
          .select("*")
          .eq("patient_id", patientId)
          .order("recorded_at", { ascending: false }),
      ) as Evolution[],
    enabled: Boolean(patientId),
  });
}

export function useEvolutionByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ["evolution-by-appointment", appointmentId],
    queryFn: async () => {
      const result = await supabase
        .from("evolutions")
        .select("*")
        .eq("appointment_id", appointmentId)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data as Evolution | null;
    },
    enabled: Boolean(appointmentId),
  });
}

export function useSaveEvolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Omit<Tables["evolutions"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase
          .from("evolutions")
          .upsert({ ...values, user_id: userId }, { onConflict: "appointment_id" })
          .select()
          .single(),
      ) as Evolution;
    },
    onSuccess: (evolution) => {
      qc.invalidateQueries({ queryKey: ["evolutions", evolution.patient_id] });
      qc.invalidateQueries({ queryKey: ["evolution-by-appointment", evolution.appointment_id] });
      qc.invalidateQueries({ queryKey: ["pending-evolutions"] });
    },
  });
}

export function useAnamneses(patientId: string) {
  return useQuery({
    queryKey: ["anamneses", patientId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("anamneses")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
      ) as Anamnesis[],
    enabled: Boolean(patientId),
  });
}

export function useSaveAnamnesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["anamneses"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase.from("anamneses").upsert({ ...values, user_id: userId }).select().single(),
      ) as Anamnesis;
    },
    onSuccess: (anamnesis) => qc.invalidateQueries({ queryKey: ["anamneses", anamnesis.patient_id] }),
  });
}
