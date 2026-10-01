import { supabase } from "@/integrations/supabase/client";

export async function getOnboardingProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar seu perfil profissional.");
  return data;
}

export async function getAuthenticatedDestination(userId: string) {
  const profile = await getOnboardingProfile(userId);
  return profile?.onboarding_completed ? "/meu-dia" : "/onboarding";
}