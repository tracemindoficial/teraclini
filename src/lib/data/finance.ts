import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import type { Json } from "@/integrations/supabase/types";
export type FinanceFilters = Record<string, string | number | boolean | undefined>;
export type FinanceRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  service_name_snapshot: string;
  amount_cents: number;
  received_cents: number;
  balance_cents: number;
  status: string;
  due_on: string;
  received_on?: string;
  method?: string;
  receivable_id?: string;
  package_id: string | null;
  appointment_id: string | null;
  modality: string | null;
};
export type FinanceResult = {
  rows: FinanceRow[];
  total: number;
  summary: {
    received_cents: number;
    pending_cents: number;
    partial_cents: number;
    cancelled_cents: number;
    confirmed_count: number;
    pending_count: number;
    active_packages: number;
  };
};
export async function fetchFinance(filters: FinanceFilters): Promise<FinanceResult> {
  const { data, error } = await supabase.rpc("finance_query", {
    _filters: JSON.parse(JSON.stringify(filters)) as Json,
  });
  if (error) throw new Error(error.message);
  return data as unknown as FinanceResult;
}
export const financeOptions = (filters: FinanceFilters = {}) =>
  queryOptions({ queryKey: [...queryKeys.finance, filters], queryFn: () => fetchFinance(filters) });
export function useFinance(filters: FinanceFilters) {
  return useQuery(financeOptions(filters));
}
export function useFinanceLookup(kind: string, search = "") {
  return useQuery({
    queryKey: [...queryKeys.financeLookup, kind, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("finance_lookup", {
        _kind: kind,
        _search: search,
      });
      if (error) throw new Error(error.message);
      return data as unknown as { id: string; name: string }[];
    },
  });
}
export function useFinanceAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, Json | undefined>) => {
      const { data, error } = await supabase.rpc("finance_receipt_action", { _payload: payload });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.finance }),
  });
}
export function useCancelTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("finance_cancel_title", { _id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.finance }),
  });
}
export function useImportContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      _appointment_id?: string;
      _package_id?: string;
      _mode?: string;
    }) => {
      const { error } = await supabase.rpc("finance_import_contract", args);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance });
      qc.invalidateQueries({ queryKey: queryKeys.packages });
    },
  });
}
export function useSchedulePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Json) => {
      const { data, error } = await supabase.rpc("schedule_care_package", { _payload: payload });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (id) => {
      [
        queryKeys.finance,
        queryKeys.packages,
        queryKeys.appointments,
        queryKeys.patientAppointments,
        queryKeys.package(id),
      ].forEach((queryKey) => qc.invalidateQueries({ queryKey }));
    },
  });
}
export function useFinanceHistory(id: string) {
  return useQuery({
    queryKey: [...queryKeys.finance, "history", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_financial_events")
        .select("*")
        .eq("receivable_id", id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
