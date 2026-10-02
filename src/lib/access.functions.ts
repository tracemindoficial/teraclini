import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSessionAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [adminResult, profileResult] = await Promise.all([
      supabaseAdmin
        .from("platform_admins")
        .select("role")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("onboarding_completed, account:accounts(status)")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);

    if (adminResult.error || profileResult.error) {
      throw new Error("Não foi possível verificar as permissões da conta.");
    }

    const account = profileResult.data?.account;
    return {
      isPlatformAdmin: adminResult.data?.role === "super_admin",
      accountStatus: account?.status ?? null,
      onboardingCompleted: profileResult.data?.onboarding_completed ?? false,
    };
  });