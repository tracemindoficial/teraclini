import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { confirmedRevenue, expectedRevenue, type PaymentMetric } from "@/lib/admin-metrics";
import type { SupabaseClient } from "@supabase/supabase-js";

const requirePlatformAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("platform_admins")
      .select("id, role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !data) throw new Response("Forbidden", { status: 403 });
    return next({ context: { ...context, supabaseAdmin, platformAdminId: data.id } });
  });

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function recordAudit(
  supabaseAdmin: SupabaseClient<Database>,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  accountId: string | null,
  changedFields: string[],
) {
  const { error } = await supabaseAdmin.from("platform_audit_events").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    account_id: accountId,
    changed_fields: changedFields,
    result: "success",
  });
  if (error) throw new Error("Não foi possível registrar a auditoria administrativa.");
}

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async () => ({ authorized: true as const }));

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);
    const sevenDaysAgo = addDays(now, -7);
    const thirtyDaysAgo = addDays(now, -30);
    const inSevenDays = addDays(now, 7);
    const inThirtyDays = addDays(now, 30);

    const [accountsResult, profilesResult, subscriptionsResult, paymentsResult, usageResult] = await Promise.all([
      context.supabaseAdmin.from("accounts").select("id, status, created_at"),
      context.supabaseAdmin.from("profiles").select("id, onboarding_completed, created_at"),
      context.supabaseAdmin.from("account_subscriptions").select("id, status, contracted_price_cents, next_due_on"),
      context.supabaseAdmin.from("payments").select("amount_cents, status, due_on, paid_at, confirmed_at"),
      context.supabaseAdmin.from("usage_events").select("account_id, module, occurred_at").gte("occurred_at", thirtyDaysAgo.toISOString()),
    ]);

    const firstError = [accountsResult, profilesResult, subscriptionsResult, paymentsResult, usageResult].find((result) => result.error)?.error;
    if (firstError) throw new Error("Não foi possível carregar a visão administrativa.");

    const accounts = accountsResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const subscriptions = subscriptionsResult.data ?? [];
    const payments = (paymentsResult.data ?? []) as PaymentMetric[];
    const usage = usageResult.data ?? [];
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const yearEnd = new Date(yearStart.getFullYear() + 1, 0, 1);

    const statusCount = (status: string) => subscriptions.filter((item) => item.status === status).length;
    const dueBetween = (from: Date, to: Date) => payments.filter((item) => {
      const due = new Date(`${item.due_on}T00:00:00`);
      return due >= from && due < to && !["confirmed", "refunded", "cancelled", "rejected"].includes(item.status);
    });

    const registrationsByMonth = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      return {
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
        total: accounts.filter((account) => new Date(account.created_at) >= date && new Date(account.created_at) < next).length,
      };
    });

    const activeAccounts7 = new Set(usage.filter((item) => new Date(item.occurred_at) >= sevenDaysAgo).map((item) => item.account_id)).size;
    const activeAccounts30 = new Set(usage.map((item) => item.account_id)).size;

    return {
      generatedAt: now.toISOString(),
      telemetrySince: usage.length ? usage.reduce((earliest, item) => item.occurred_at < earliest ? item.occurred_at : earliest, usage[0]?.occurred_at ?? now.toISOString()) : null,
      users: {
        total: accounts.length,
        active: accounts.filter((item) => item.status === "active").length,
        newMonth: accounts.filter((item) => new Date(item.created_at) >= monthStart).length,
        new7Days: accounts.filter((item) => new Date(item.created_at) >= sevenDaysAgo).length,
        new30Days: accounts.filter((item) => new Date(item.created_at) >= thirtyDaysAgo).length,
        onboardingPending: profiles.filter((item) => !item.onboarding_completed).length,
      },
      subscriptions: {
        active: statusCount("active"),
        awaiting: statusCount("awaiting_first_payment") + statusCount("payment_pending"),
        grace: statusCount("grace_period"),
        restricted: statusCount("restricted"),
        cancelled: statusCount("cancelled"),
      },
      finance: {
        receivedMonthCents: confirmedRevenue(payments, monthStart, monthEnd),
        receivedYearCents: confirmedRevenue(payments, yearStart, yearEnd),
        expectedMonthCents: expectedRevenue(payments, monthStart, monthEnd),
        pendingCount: payments.filter((item) => item.status === "pending" || item.status === "under_review").length,
        overdueCount: payments.filter((item) => item.status === "overdue").length,
        due7DaysCents: dueBetween(now, inSevenDays).reduce((sum, item) => sum + item.amount_cents, 0),
        due30DaysCents: dueBetween(now, inThirtyDays).reduce((sum, item) => sum + item.amount_cents, 0),
        mrrCents: subscriptions.filter((item) => item.status === "active").reduce((sum, item) => sum + item.contracted_price_cents, 0),
      },
      usage: { activeAccounts7, activeAccounts30, events30: usage.length },
      registrationsByMonth,
    };
  });

const userListInput = z.object({
  search: z.string().max(120).default(""),
  status: z.enum(["all", "active", "suspended", "closed"]).default("all"),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(20),
});

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => userListInput.parse(input))
  .handler(async ({ data, context }) => {
    const users = [] as Array<{ id: string; email: string | undefined; created_at: string; last_sign_in_at: string | undefined }>;
    for (let page = 1; page <= 100; page += 1) {
      const result = await context.supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error("Não foi possível carregar os usuários.");
      users.push(...result.data.users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at })));
      if (result.data.users.length < 1000) break;
    }

    const [profilesResult, accountsResult, subscriptionsResult, plansResult, paymentsResult] = await Promise.all([
      context.supabaseAdmin.from("profiles").select("id, account_id, full_name, profession, onboarding_completed"),
      context.supabaseAdmin.from("accounts").select("id, owner_user_id, status, created_at"),
      context.supabaseAdmin.from("account_subscriptions").select("id, account_id, plan_id, contracted_price_cents, starts_on, next_due_on, status, cancelled_at"),
      context.supabaseAdmin.from("subscription_plans").select("id, name"),
      context.supabaseAdmin.from("payments").select("account_id, status, confirmed_at").eq("status", "confirmed").order("confirmed_at", { ascending: false }),
    ]);
    const firstError = [profilesResult, accountsResult, subscriptionsResult, plansResult, paymentsResult].find((result) => result.error)?.error;
    if (firstError) throw new Error("Não foi possível carregar o diretório administrativo.");

    const profiles = new Map((profilesResult.data ?? []).map((item) => [item.id, item]));
    const accounts = new Map((accountsResult.data ?? []).map((item) => [item.owner_user_id, item]));
    const subscriptions = new Map((subscriptionsResult.data ?? []).map((item) => [item.account_id, item]));
    const plans = new Map((plansResult.data ?? []).map((item) => [item.id, item.name]));
    const lastPayments = new Map<string, string>();
    for (const payment of paymentsResult.data ?? []) {
      if (payment.confirmed_at && !lastPayments.has(payment.account_id)) lastPayments.set(payment.account_id, payment.confirmed_at);
    }

    const search = data.search.trim().toLocaleLowerCase("pt-BR");
    const rows = users.map((user) => {
      const profile = profiles.get(user.id);
      const account = accounts.get(user.id);
      const subscription = account ? subscriptions.get(account.id) : undefined;
      return {
        id: user.id,
        accountId: account?.id ?? null,
        name: profile?.full_name || "Cadastro incompleto",
        email: user.email ?? "E-mail indisponível",
        profession: profile?.profession ?? null,
        createdAt: account?.created_at ?? user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        onboardingCompleted: profile?.onboarding_completed ?? false,
        accountStatus: account?.status ?? "active",
        subscriptionStatus: subscription?.status ?? null,
        planName: subscription ? plans.get(subscription.plan_id) ?? "Plano indisponível" : null,
        monthlyCents: subscription?.contracted_price_cents ?? null,
        startsOn: subscription?.starts_on ?? null,
        nextDueOn: subscription?.next_due_on ?? null,
        cancelledAt: subscription?.cancelled_at ?? null,
        lastPaymentAt: account ? lastPayments.get(account.id) ?? null : null,
      };
    }).filter((row) => {
      const matchesSearch = !search || row.name.toLocaleLowerCase("pt-BR").includes(search) || row.email.toLocaleLowerCase("pt-BR").includes(search);
      const matchesStatus = data.status === "all" || row.accountStatus === data.status;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (data.page - 1) * data.pageSize;
    return { rows: rows.slice(start, start + data.pageSize), total: rows.length, page: data.page, pageSize: data.pageSize };
  });

export const listAdminSubscriptions = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabaseAdmin
      .from("account_subscriptions")
      .select("*, account:accounts(id, name, owner_user_id), plan:subscription_plans(id, name)")
      .order("next_due_on");
    if (error) throw new Error("Não foi possível carregar as assinaturas.");
    return data;
  });

export const listAdminPayments = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabaseAdmin
      .from("payments")
      .select("*, account:accounts(id, name), subscription:account_subscriptions(id)")
      .order("due_on", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os pagamentos.");
    return data;
  });

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const [plans, settings] = await Promise.all([
      context.supabaseAdmin.from("subscription_plans").select("*").order("created_at"),
      context.supabaseAdmin.from("commercial_settings").select("*").order("setting_key"),
    ]);
    if (plans.error || settings.error) throw new Error("Não foi possível carregar as configurações.");
    return { plans: plans.data ?? [], settings: settings.data ?? [] };
  });

const paymentActionInput = z.object({ paymentId: z.string().uuid(), confirm: z.literal(true) });

export const confirmAdminPayment = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => paymentActionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment, error: readError } = await context.supabaseAdmin.from("payments").select("id, account_id, status, amount_cents").eq("id", data.paymentId).single();
    if (readError || !payment) throw new Error("Pagamento não encontrado.");
    if (payment.status === "confirmed") return { ok: true, unchanged: true };
    if (["refunded", "cancelled"].includes(payment.status)) throw new Error("Este pagamento não pode ser confirmado.");
    const now = new Date().toISOString();
    const { error } = await context.supabaseAdmin.from("payments").update({ status: "confirmed", paid_at: now, confirmed_at: now, confirmed_by: context.userId, confirmation_source: "manual_admin" }).eq("id", payment.id);
    if (error) throw new Error("Não foi possível confirmar o pagamento.");
    const { error: eventError } = await context.supabaseAdmin.from("payment_events").insert({ payment_id: payment.id, account_id: payment.account_id, actor_user_id: context.userId, event_type: "manual_confirmation", previous_status: payment.status, new_status: "confirmed", amount_cents: payment.amount_cents });
    if (eventError) throw new Error("Pagamento confirmado, mas o histórico não foi registrado.");
    await recordAudit(context.supabaseAdmin, context.userId, "payment.confirm", "payment", payment.id, payment.account_id, ["status", "paid_at", "confirmed_at", "confirmed_by", "confirmation_source"]);
    return { ok: true, unchanged: false };
  });
