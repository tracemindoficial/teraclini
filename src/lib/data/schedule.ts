import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { unwrap, type CustomAppointmentType, type Room, type Tables } from "./shared";

export type AvailabilityRule = Tables["availability_rules"]["Row"];
export type ScheduleBlock = Tables["schedule_blocks"]["Row"];
export type AppointmentEvent = Tables["appointment_events"]["Row"];

function invalidateSchedule(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.rooms });
  qc.invalidateQueries({ queryKey: queryKeys.availability });
  qc.invalidateQueries({ queryKey: queryKeys.scheduleBlocks });
  qc.invalidateQueries({ queryKey: queryKeys.appointmentTypes });
  qc.invalidateQueries({ queryKey: queryKeys.onboardingTasks });
}

export function useRooms(locationId?: string) {
  return useQuery({
    queryKey: [...queryKeys.rooms, locationId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("rooms").select("*").order("name");
      if (locationId) query = query.eq("location_id", locationId);
      return unwrap(await query) as Room[];
    },
  });
}

export function useSaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Tables["rooms"]["Insert"] & { id?: string }) =>
      unwrap(await supabase.from("rooms").upsert(values).select().single()) as Room,
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useAvailabilityRules() {
  return useQuery({
    queryKey: queryKeys.availability,
    queryFn: async () =>
      unwrap(await supabase.from("availability_rules").select("*").order("weekday").order("start_time")) as AvailabilityRule[],
  });
}

export function useSaveAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Tables["availability_rules"]["Insert"] & { id?: string }) =>
      unwrap(await supabase.from("availability_rules").upsert(values).select().single()) as AvailabilityRule,
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useDeleteAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_rules").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useScheduleBlocks(from?: string, to?: string) {
  return useQuery({
    queryKey: [...queryKeys.scheduleBlocks, from ?? "all", to ?? "all"],
    queryFn: async () => {
      let query = supabase.from("schedule_blocks").select("*").order("starts_at");
      if (from) query = query.gt("ends_at", from);
      if (to) query = query.lt("starts_at", to);
      return unwrap(await query) as ScheduleBlock[];
    },
  });
}

export function useSaveScheduleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Tables["schedule_blocks"]["Insert"] & { id?: string }) =>
      unwrap(await supabase.from("schedule_blocks").upsert(values).select().single()) as ScheduleBlock,
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useDeleteScheduleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_blocks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useAppointmentTypes() {
  return useQuery({
    queryKey: queryKeys.appointmentTypes,
    queryFn: async () =>
      unwrap(await supabase.from("appointment_types").select("*").eq("is_active", true).order("name")) as CustomAppointmentType[],
  });
}

export function useSaveAppointmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Tables["appointment_types"]["Insert"] & { id?: string }) =>
      unwrap(await supabase.from("appointment_types").upsert(values).select().single()) as CustomAppointmentType,
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useAppointmentEvents(appointmentId: string) {
  return useQuery({
    queryKey: queryKeys.appointmentEvents(appointmentId),
    queryFn: async () =>
      unwrap(await supabase.from("appointment_events").select("*").eq("appointment_id", appointmentId).order("created_at", { ascending: false })) as AppointmentEvent[],
    enabled: Boolean(appointmentId),
  });
}