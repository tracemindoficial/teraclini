import { supabase } from "@/integrations/supabase/client";
import { getSessionAccess } from "@/lib/access.functions";

export async function getOnboardingProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed, force_password_reset")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar seu perfil profissional.");
  return data;
}

export async function getAuthenticatedDestination(userId: string) {
  const access = await getSessionAccess();
  if (access.accountStatus !== "active") return "/conta-indisponivel";
  const profile = await getOnboardingProfile(userId);
  return profile?.onboarding_completed ? "/meu-dia" : "/onboarding";
}
