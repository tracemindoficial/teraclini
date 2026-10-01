import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, unwrap, type Profile, type Tables } from "./shared";
import { queryKeys } from "@/lib/query-keys";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const userId = await currentUserId();
      const result = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Tables["profiles"]["Update"]) => {
      const userId = await currentUserId();
      const result = await supabase
        .from("profiles")
        .upsert({ id: userId, ...values })
        .select()
        .single();
      return unwrap(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
      qc.invalidateQueries({ queryKey: queryKeys.onboardingTasks });
    },
  });
}
