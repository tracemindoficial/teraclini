import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { HelpCategory, HelpTutorial } from "@/lib/help-types";
import { queryKeys } from "@/lib/query-keys";

export async function fetchHelpCenter() {
  const [{ data: categories, error: categoryError }, { data: tutorials, error: tutorialError }] =
    await Promise.all([
      supabase
        .from("help_categories")
        .select("id,name,slug,description,icon,order_index")
        .order("order_index"),
      supabase
        .from("help_tutorials")
        .select(
          "id,category_id,title,slug,short_description,objective,content,expected_result,keywords,route_path,visibility,order_index,is_active,media_url",
        )
        .order("order_index"),
    ]);
  if (categoryError || tutorialError) throw categoryError ?? tutorialError;
  return {
    categories: (categories ?? []) as HelpCategory[],
    tutorials: (tutorials ?? []) as HelpTutorial[],
  };
}

export async function fetchHelpTutorial(slug: string) {
  const { data, error } = await supabase
    .from("help_tutorials")
    .select(
      "id,category_id,title,slug,short_description,objective,content,expected_result,keywords,route_path,visibility,order_index,is_active,media_url,help_categories(id,name,slug,description,icon,order_index),help_tutorial_steps(id,title,instruction,target_selector,order_index)",
    )
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const row = data as typeof data & {
    help_categories: HelpCategory;
    help_tutorial_steps: HelpTutorial["steps"];
  };
  return {
    ...row,
    category: row.help_categories,
    steps: [...(row.help_tutorial_steps ?? [])].sort((a, b) => a.order_index - b.order_index),
  } as HelpTutorial;
}

export function useHelpCenter() {
  return useQuery({ queryKey: queryKeys.helpCenter, queryFn: fetchHelpCenter });
}

export function useHelpTutorial(slug: string) {
  return useQuery({
    queryKey: queryKeys.helpTutorial(slug),
    queryFn: () => fetchHelpTutorial(slug),
    enabled: Boolean(slug),
  });
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão não encontrada.");
  return data.user.id;
}

export async function recordHelpEvent(input: {
  eventType: "view" | "search" | "no_results" | "completed" | "guide_started" | "guide_skipped";
  tutorialId?: string;
  searchTerm?: string;
  hasResults?: boolean;
}) {
  const userId = await currentUserId();
  const term = input.searchTerm?.trim().toLocaleLowerCase("pt-BR").slice(0, 120) || null;
  await supabase.from("help_events").insert({
    user_id: userId,
    tutorial_id: input.tutorialId ?? null,
    event_type: input.eventType,
    search_term: term,
    has_results: input.hasResults ?? null,
  });
}

export function useCompleteHelpTutorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tutorialId: string) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("help_progress").upsert(
        {
          user_id: userId,
          tutorial_id: tutorialId,
          completed_at: new Date().toISOString(),
          current_step: 0,
        },
        { onConflict: "user_id,tutorial_id" },
      );
      if (error) throw error;
      await recordHelpEvent({ eventType: "completed", tutorialId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.helpProgress }),
  });
}
