import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OnboardingTask = Database["public"]["Tables"]["onboarding_tasks"]["Row"];

export function useOnboardingTasks() {
  return useQuery({
    queryKey: ["onboarding-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .select("*")
        .order("created_at");
      if (error) throw new Error(error.message);
      return data as OnboardingTask[];
    },
  });
}