import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { queryKeys } from "@/lib/query-keys";

export type RegistrationLink = Database["public"]["Tables"]["patient_registration_links"]["Row"];
export type RegistrationRequest =
  Database["public"]["Tables"]["patient_registration_requests"]["Row"];
export type RegistrationDuplicate =
  Database["public"]["Functions"]["patient_registration_duplicates"]["Returns"][number];

export function useRegistrationLinks() {
  return useQuery({
    queryKey: queryKeys.registrationLinks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_registration_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as RegistrationLink[];
    },
  });
}
export function useRegistrationRequests() {
  return useQuery({
    queryKey: queryKeys.registrationRequests,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_registration_requests")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as RegistrationRequest[];
    },
  });
}
export function useRegistrationRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.registrationRequest(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_registration_requests")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data as RegistrationRequest;
    },
    enabled: Boolean(id),
  });
}
export function useRegistrationDuplicates(id: string) {
  return useQuery({
    queryKey: queryKeys.registrationDuplicates(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("patient_registration_duplicates", {
        _request_id: id,
      });
      if (error) throw new Error(error.message);
      return data as RegistrationDuplicate[];
    },
    enabled: Boolean(id),
  });
}
export function useSaveRegistrationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: Database["public"]["Tables"]["patient_registration_requests"]["Update"];
    }) => {
      const { data, error } = await supabase
        .from("patient_registration_requests")
        .update(values)
        .eq("id", id)
        .eq("status", "awaiting_approval")
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as RegistrationRequest;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: queryKeys.registrationRequests });
      qc.invalidateQueries({ queryKey: queryKeys.registrationRequest(row.id) });
      qc.invalidateQueries({ queryKey: queryKeys.registrationDuplicates(row.id) });
    },
  });
}
export function useRevokeRegistrationLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_registration_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.registrationLinks }),
  });
}
export function useApproveRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, existingPatientId }: { id: string; existingPatientId?: string }) => {
      const args = existingPatientId
        ? { _request_id: id, _existing_patient_id: existingPatientId }
        : { _request_id: id };
      const { data, error } = await supabase.rpc("approve_patient_registration", args);
      if (error) throw new Error(error.message);
      if (!data) throw new Error("A aprovação não retornou o paciente criado ou vinculado.");
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.registrationRequests });
      qc.invalidateQueries({ queryKey: queryKeys.registrationRequest(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.registrationDuplicates(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.patients });
      qc.invalidateQueries({ queryKey: queryKeys.onboardingTasks });
    },
  });
}
export function useRejectRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_patient_registration", {
        _request_id: id,
        _reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.registrationRequests });
      qc.invalidateQueries({ queryKey: queryKeys.registrationRequest(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.registrationDuplicates(variables.id) });
    },
  });
}
