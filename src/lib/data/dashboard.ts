import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APPOINTMENT_SELECT, unwrap, type AppointmentWithRefs, type Location, type Patient, type PatientDocument } from "./shared";

export function usePendingEvolutions() {
  return useQuery({
    queryKey: ["pending-evolutions"],
    queryFn: async () => {
      const appointments = unwrap(
        await supabase
          .from("appointments")
          .select(APPOINTMENT_SELECT)
          .lt("starts_at", new Date().toISOString())
          .in("status", ["agendado", "confirmado", "realizado"])
          .order("starts_at", { ascending: false })
          .limit(30),
      ) as unknown as AppointmentWithRefs[];

      const ids = appointments.map((a) => a.id);
      if (ids.length === 0) return [];
      const evolutions = unwrap(
        await supabase.from("evolutions").select("appointment_id").in("appointment_id", ids),
      ) as { appointment_id: string }[];
      const done = new Set(evolutions.map((e) => e.appointment_id));
      return appointments.filter((a) => a.patient_id && !done.has(a.id));
    },
  });
}

export function useGlobalSearch(term: string) {
  return useQuery({
    queryKey: ["global-search", term],
    queryFn: async () => {
      const like = `%${term.trim()}%`;
      const [patients, locations, documents] = await Promise.all([
        supabase.from("patients").select("id, full_name, status").ilike("full_name", like).limit(8),
        supabase.from("locations").select("id, name, type").ilike("name", like).limit(5),
        supabase.from("documents").select("id, title, patient_id").ilike("title", like).limit(5),
      ]);
      return {
        patients: (patients.data ?? []) as Pick<Patient, "id" | "full_name" | "status">[],
        locations: (locations.data ?? []) as Pick<Location, "id" | "name" | "type">[],
        documents: (documents.data ?? []) as Pick<PatientDocument, "id" | "title" | "patient_id">[],
      };
    },
    enabled: term.trim().length >= 2,
  });
}
