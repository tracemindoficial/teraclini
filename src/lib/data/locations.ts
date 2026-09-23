import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, unwrap, type Location, type Tables } from "./shared";

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () =>
      unwrap(await supabase.from("locations").select("*").order("name")) as Location[],
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["locations"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      const result = await supabase
        .from("locations")
        .upsert({ ...values, user_id: userId })
        .select()
        .single();
      return unwrap(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["onboarding-tasks"] });
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}
