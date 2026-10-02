import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const usageInput = z.object({
  module: z.enum([
    "session",
    "dashboard",
    "agenda",
    "patients",
    "appointments",
    "documents",
    "packages",
    "reports",
    "settings",
    "help",
    "support",
  ]),
  action: z.enum(["view"]),
});

export const recordUsageEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => usageInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: accountId, error: accountError } =
      await context.supabase.rpc("current_account_id");
    if (accountError || !accountId) return { recorded: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const minuteStart = new Date();
    minuteStart.setSeconds(0, 0);
    const { data: existing } = await supabaseAdmin
      .from("usage_events")
      .select("id")
      .eq("account_id", accountId)
      .eq("user_id", context.userId)
      .eq("module", data.module)
      .eq("action", data.action)
      .gte("occurred_at", minuteStart.toISOString())
      .limit(1)
      .maybeSingle();
    if (existing) return { recorded: false as const };
    const { error } = await supabaseAdmin.from("usage_events").insert({
      account_id: accountId,
      user_id: context.userId,
      module: data.module,
      action: data.action,
    });
    if (error) throw new Error("Não foi possível registrar a utilização técnica.");
    return { recorded: true as const };
  });
