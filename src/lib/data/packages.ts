import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";
export { packageStatus, packageUsage, type PackageDisplayStatus } from "@/lib/package-metrics";
import {
  currentUserId,
  unwrap,
  type CustomAppointmentType,
  type Patient,
  type Tables,
} from "./shared";

export type CarePackage = Tables["care_packages"]["Row"];
export type CarePackageEvent = Tables["care_package_events"]["Row"];
export type PackageAppointment = Pick<
  Tables["appointments"]["Row"],
  "id" | "starts_at" | "ends_at" | "status" | "modality" | "package_session_value"
>;

export type CarePackageWithRefs = CarePackage & {
  patient: Pick<Patient, "id" | "full_name">;
  appointment_type: Pick<CustomAppointmentType, "id" | "name"> | null;
  appointments: PackageAppointment[];
};

const PACKAGE_SELECT =
  "*, patient:patients(id, full_name), appointment_type:appointment_types(id, name), appointments(id, starts_at, ends_at, status, modality, package_session_value)";

export function usePackages(patientId?: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.packages, patientId ?? "all"],
    enabled,
    queryFn: async () => {
      let query = supabase
        .from("care_packages")
        .select(PACKAGE_SELECT)
        .order("start_date", { ascending: false });
      if (patientId) query = query.eq("patient_id", patientId);
      return unwrap(await query) as unknown as CarePackageWithRefs[];
    },
  });
}

export function usePackage(id: string) {
  return useQuery({
    queryKey: queryKeys.package(id),
    queryFn: async () =>
      unwrap(
        await supabase.from("care_packages").select(PACKAGE_SELECT).eq("id", id).single(),
      ) as unknown as CarePackageWithRefs,
    enabled: Boolean(id),
  });
}

export function usePackageEvents(packageId: string) {
  return useQuery({
    queryKey: queryKeys.packageEvents(packageId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("care_package_events")
          .select("*")
          .eq("package_id", packageId)
          .order("created_at", { ascending: false }),
      ) as CarePackageEvent[],
    enabled: Boolean(packageId),
  });
}

function invalidatePackages(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.finance });
  qc.invalidateQueries({ queryKey: queryKeys.packages });
  qc.invalidateQueries({ queryKey: queryKeys.appointments });
  qc.invalidateQueries({ queryKey: queryKeys.patientAppointments });
  if (id) qc.invalidateQueries({ queryKey: queryKeys.package(id) });
}

export function useSavePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Omit<Tables["care_packages"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase
          .from("care_packages")
          .upsert({ ...values, user_id: userId })
          .select()
          .single(),
      ) as CarePackage;
    },
    onSuccess: (item) => invalidatePackages(qc, item.id),
  });
}

export function useCancelPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .from("care_packages")
          .update({ lifecycle_status: "cancelado" })
          .eq("id", id)
          .select()
          .single(),
      ) as CarePackage,
    onSuccess: (item) => invalidatePackages(qc, item.id),
  });
}
