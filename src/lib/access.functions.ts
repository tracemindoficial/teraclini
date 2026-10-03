import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSessionAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [adminResult, profileResult] = await Promise.all([
      supabaseAdmin
        .from("platform_admins")
        .select("role, revoked_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("onboarding_completed, account:accounts(status, blocked_at, block_reason)")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);

    if (adminResult.error || profileResult.error) {
      throw new Error("Não foi possível verificar as permissões da conta.");
    }

    const account = profileResult.data?.account;
    return {
      isPlatformAdmin: Boolean(adminResult.data?.role && !adminResult.data.revoked_at),
      accountStatus: account?.status ?? null,
      accountBlocked: Boolean(account?.blocked_at),
      accountBlockReason: account?.block_reason ?? null,
      onboardingCompleted: profileResult.data?.onboarding_completed ?? false,
    };
  });
