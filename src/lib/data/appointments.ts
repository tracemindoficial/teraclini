import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  APPOINTMENT_SELECT,
  currentUserId,
  unwrap,
  type Appointment,
  type AppointmentWithRefs,
  type Tables,
} from "./shared";
import { queryKeys } from "@/lib/query-keys";

export function useAppointments(params: {
  from: string;
  to: string;
  locationId?: string | undefined;
}) {
  return useQuery({
    queryKey: [...queryKeys.appointments, params.from, params.to, params.locationId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .gte("starts_at", params.from)
        .lt("starts_at", params.to)
        .order("starts_at");
      if (params.locationId) query = query.eq("location_id", params.locationId);
      return unwrap(await query) as unknown as AppointmentWithRefs[];
    },
  });
}

export function usePatientAppointments(patientId: string) {
  return useQuery({
    queryKey: [...queryKeys.patientAppointments, patientId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("appointments")
          .select(APPOINTMENT_SELECT)
          .eq("patient_id", patientId)
          .order("starts_at", { ascending: false }),
      ) as unknown as AppointmentWithRefs[],
    enabled: Boolean(patientId),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: [...queryKeys.appointment, id],
    queryFn: async () =>
      unwrap(
        await supabase.from("appointments").select(APPOINTMENT_SELECT).eq("id", id).single(),
      ) as unknown as AppointmentWithRefs,
    enabled: Boolean(id),
  });
}

export function useSaveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Omit<Tables["appointments"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase
          .from("appointments")
          .upsert({ ...values, user_id: userId })
          .select()
          .single(),
      ) as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
      qc.invalidateQueries({ queryKey: queryKeys.patientAppointments });
      qc.invalidateQueries({ queryKey: queryKeys.appointment });
      qc.invalidateQueries({ queryKey: queryKeys.pendingEvolutions });
      qc.invalidateQueries({ queryKey: queryKeys.onboardingTasks });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
      qc.invalidateQueries({ queryKey: queryKeys.patientAppointments });
    },
  });
}
