import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireAnalyticsAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_admins")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data || !["super_admin", "analyst"].includes(data.role))
      throw new Response("Forbidden", { status: 403 });
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("status")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!account || account.status !== "active") throw new Response("Forbidden", { status: 403 });
    return next({ context: { ...context, supabaseAdmin } });
  });

export const getAdminUsageMetrics = createServerFn({ method: "GET" })
  .middleware([requireAnalyticsAdmin])
  .handler(async ({ context }) => {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    const [usage, accounts, completedAppointments] = await Promise.all([
      context.supabaseAdmin
        .from("usage_events")
        .select("account_id, module, occurred_at")
        .gte("occurred_at", since.toISOString()),
      context.supabaseAdmin.from("accounts").select("id, status, created_at"),
      context.supabaseAdmin
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "realizado"),
    ]);
    if (usage.error || accounts.error || completedAppointments.error)
      throw new Error("Não foi possível carregar as métricas.");
    const events = usage.data ?? [];
    const rows = accounts.data ?? [];
    const moduleCounts = new Map<string, number>();
    for (const item of events)
      moduleCounts.set(item.module, (moduleCounts.get(item.module) ?? 0) + 1);
    const daily = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(since);
      date.setDate(date.getDate() + index);
      const day = date.toISOString().slice(0, 10);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      return {
        day,
        label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date),
        events: events.filter(
          (item) => item.occurred_at >= date.toISOString() && item.occurred_at < next.toISOString(),
        ).length,
        registrations: rows.filter(
          (item) => item.created_at >= date.toISOString() && item.created_at < next.toISOString(),
        ).length,
      };
    });
    return {
      telemetrySince: events.length
        ? events.reduce(
            (min, item) => (item.occurred_at < min ? item.occurred_at : min),
            events[0]?.occurred_at ?? since.toISOString(),
          )
        : null,
      totals: {
        events: events.length,
        activeAccounts: new Set(events.map((item) => item.account_id)).size,
        completedAppointments: completedAppointments.count ?? 0,
        suspendedOrClosed: rows.filter((item) => item.status !== "active").length,
      },
      modules: [...moduleCounts.entries()]
        .map(([module, total]) => ({ module, total }))
        .sort((a, b) => b.total - a.total),
      daily,
    };
  });
