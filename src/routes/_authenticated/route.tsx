import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getOnboardingProfile } from "@/lib/auth-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const profile = await getOnboardingProfile(data.user.id);
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
