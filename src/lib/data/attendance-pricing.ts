import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";

export type AttendancePricing = { single_session_cents: number; package_total_cents: number; package_quantity: number };
const KEY = ["attendance-pricing"] as const;

export function useAttendancePricing(enabled = true) {
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_attendance_pricing");
      if (error) throw new Error(error.message);
      return data as unknown as AttendancePricing;
    },
  });
}

export function useSaveAttendancePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: AttendancePricing) => {
      const { error } = await supabase.rpc("save_attendance_pricing", { _single_cents: v.single_session_cents, _package_cents: v.package_total_cents, _quantity: v.package_quantity });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useScheduleContractPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc("schedule_contract_package", { _payload: payload as never });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSettled: () => Promise.all([queryKeys.finance, queryKeys.packages, queryKeys.appointments, queryKeys.patientAppointments].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}
