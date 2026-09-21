import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError) throw new Error("Não foi possível verificar seu perfil profissional.");
    if ((!profile || !profile.onboarding_completed) && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (profile?.onboarding_completed && location.pathname === "/onboarding") {
      throw redirect({ to: "/meu-dia" });
    }
    return { user: data.user, profile };
  },
  component: () => <Outlet />,
});
