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
      .select("id, role, revoked_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !data || data.revoked_at) throw new Response("Forbidden", { status: 403 });
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("status")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!account || account.status !== "active") throw new Response("Forbidden", { status: 403 });
    return next({
      context: {
        ...context,
        supabaseAdmin,
        platformAdminId: data.id,
        platformAdminRole: data.role,
      },
    });
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

export const getAdminSelf = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || !data.user) throw new Error("Não foi possível carregar o perfil administrativo.");
    const { data: profile } = await context.supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      name: profile?.full_name || data.user.user_metadata?.["full_name"] || "Administrador",
      email: data.user.email ?? "E-mail indisponível",
      lastSignInAt: data.user.last_sign_in_at ?? null,
      role: context.platformAdminRole,
    };
  });

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

    const [accountsResult, profilesResult, subscriptionsResult, paymentsResult, usageResult] =
      await Promise.all([
        context.supabaseAdmin.from("accounts").select("id, status, created_at"),
        context.supabaseAdmin.from("profiles").select("id, onboarding_completed, created_at"),
        context.supabaseAdmin
          .from("account_subscriptions")
          .select("id, status, contracted_price_cents, next_due_on"),
        context.supabaseAdmin
          .from("payments")
          .select("amount_cents, status, due_on, paid_at, confirmed_at"),
        context.supabaseAdmin
          .from("usage_events")
          .select("account_id, module, occurred_at")
          .gte("occurred_at", thirtyDaysAgo.toISOString()),
      ]);

    const firstError = [
      accountsResult,
      profilesResult,
      subscriptionsResult,
      paymentsResult,
      usageResult,
    ].find((result) => result.error)?.error;
    if (firstError) throw new Error("Não foi possível carregar a visão administrativa.");

    const accounts = accountsResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const subscriptions = subscriptionsResult.data ?? [];
    const payments = (paymentsResult.data ?? []) as PaymentMetric[];
    const usage = usageResult.data ?? [];
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const yearEnd = new Date(yearStart.getFullYear() + 1, 0, 1);

    const statusCount = (status: string) =>
      subscriptions.filter((item) => item.status === status).length;
    const dueBetween = (from: Date, to: Date) =>
      payments.filter((item) => {
        const due = new Date(`${item.due_on}T00:00:00`);
        return (
          due >= from &&
          due < to &&
          !["confirmed", "refunded", "cancelled", "rejected"].includes(item.status)
        );
      });

    const registrationsByMonth = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      return {
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
        total: accounts.filter(
          (account) => new Date(account.created_at) >= date && new Date(account.created_at) < next,
        ).length,
      };
    });

    const activeAccounts7 = new Set(
      usage
        .filter((item) => new Date(item.occurred_at) >= sevenDaysAgo)
        .map((item) => item.account_id),
    ).size;
    const activeAccounts30 = new Set(usage.map((item) => item.account_id)).size;

    return {
      generatedAt: now.toISOString(),
      telemetrySince: usage.length
        ? usage.reduce(
            (earliest, item) => (item.occurred_at < earliest ? item.occurred_at : earliest),
            usage[0]?.occurred_at ?? now.toISOString(),
          )
        : null,
      users: {
        total: accounts.length,
        active: accounts.filter((item) => item.status === "active").length,
        suspended: accounts.filter((item) => item.status === "suspended").length,
        closed: accounts.filter((item) => item.status === "closed").length,
        newToday: accounts.filter(
          (item) => new Date(item.created_at).toDateString() === now.toDateString(),
        ).length,
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
        pendingCount: payments.filter(
          (item) => item.status === "pending" || item.status === "under_review",
        ).length,
        overdueCount: payments.filter((item) => item.status === "overdue").length,
        due7DaysCents: dueBetween(now, inSevenDays).reduce(
          (sum, item) => sum + item.amount_cents,
          0,
        ),
        due30DaysCents: dueBetween(now, inThirtyDays).reduce(
          (sum, item) => sum + item.amount_cents,
          0,
        ),
        mrrCents: subscriptions
          .filter((item) => item.status === "active")
          .reduce((sum, item) => sum + item.contracted_price_cents, 0),
      },
      usage: { activeAccounts7, activeAccounts30, events30: usage.length },
      registrationsByMonth,
    };
  });

const userListInput = z.object({
  search: z.string().max(120).default(""),
  status: z.enum(["all", "active", "suspended", "closed"]).default("all"),
  role: z
    .enum([
      "all",
      "professional",
      "super_admin",
      "support_admin",
      "analyst",
      "finance_admin",
      "content_admin",
    ])
    .default("all"),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(20),
  sort: z.enum(["newest", "oldest", "name", "last_activity"]).default("newest"),
});

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => userListInput.parse(input))
  .handler(async ({ data, context }) => {
    const users = [] as Array<{
      id: string;
      email: string | undefined;
      created_at: string;
      last_sign_in_at: string | undefined;
    }>;
    for (let page = 1; page <= 100; page += 1) {
      const result = await context.supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error("Não foi possível carregar os usuários.");
      users.push(
        ...result.data.users.map((user) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        })),
      );
      if (result.data.users.length < 1000) break;
    }

    const [
      profilesResult,
      accountsResult,
      subscriptionsResult,
      plansResult,
      paymentsResult,
      adminsResult,
      usageResult,
    ] = await Promise.all([
      context.supabaseAdmin
        .from("profiles")
        .select("id, account_id, full_name, profession, onboarding_completed"),
      context.supabaseAdmin
        .from("accounts")
        .select(
          "id, owner_user_id, status, blocked_at, block_reason, access_state_changed_at, created_at",
        ),
      context.supabaseAdmin
        .from("account_subscriptions")
        .select(
          "id, account_id, plan_id, contracted_price_cents, starts_on, next_due_on, status, cancelled_at",
        ),
      context.supabaseAdmin.from("subscription_plans").select("id, name"),
      context.supabaseAdmin
        .from("payments")
        .select("account_id, status, confirmed_at")
        .eq("status", "confirmed")
        .order("confirmed_at", { ascending: false }),
      context.supabaseAdmin.from("platform_admins").select("user_id, role, revoked_at"),
      context.supabaseAdmin
        .from("usage_events")
        .select("account_id, occurred_at")
        .order("occurred_at", { ascending: false }),
    ]);
    const firstError = [
      profilesResult,
      accountsResult,
      subscriptionsResult,
      plansResult,
      paymentsResult,
      adminsResult,
      usageResult,
    ].find((result) => result.error)?.error;
    if (firstError) throw new Error("Não foi possível carregar o diretório administrativo.");

    const profiles = new Map((profilesResult.data ?? []).map((item) => [item.id, item]));
    const accounts = new Map((accountsResult.data ?? []).map((item) => [item.owner_user_id, item]));
    const subscriptions = new Map(
      (subscriptionsResult.data ?? []).map((item) => [item.account_id, item]),
    );
    const plans = new Map((plansResult.data ?? []).map((item) => [item.id, item.name]));
    const lastPayments = new Map<string, string>();
    for (const payment of paymentsResult.data ?? []) {
      if (payment.confirmed_at && !lastPayments.has(payment.account_id))
        lastPayments.set(payment.account_id, payment.confirmed_at);
    }
    const admins = new Map(
      (adminsResult.data ?? [])
        .filter((item) => !item.revoked_at)
        .map((item) => [item.user_id, item.role]),
    );
    const lastActivity = new Map<string, string>();
    for (const event of usageResult.data ?? [])
      if (!lastActivity.has(event.account_id))
        lastActivity.set(event.account_id, event.occurred_at);

    const search = data.search.trim().toLocaleLowerCase("pt-BR");
    const rows = users
      .map((user) => {
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
          accountBlocked: Boolean(account?.blocked_at),
          blockReason: account?.block_reason ?? null,
          accessStateChangedAt: account?.access_state_changed_at ?? account?.created_at ?? null,
          subscriptionStatus: subscription?.status ?? null,
          planName: subscription ? (plans.get(subscription.plan_id) ?? "Plano indisponível") : null,
          monthlyCents: subscription?.contracted_price_cents ?? null,
          startsOn: subscription?.starts_on ?? null,
          nextDueOn: subscription?.next_due_on ?? null,
          cancelledAt: subscription?.cancelled_at ?? null,
          lastPaymentAt: account ? (lastPayments.get(account.id) ?? null) : null,
          lastActivityAt: account ? (lastActivity.get(account.id) ?? null) : null,
          platformRole: admins.get(user.id) ?? null,
        };
      })
      .filter((row) => {
        const matchesSearch =
          !search ||
          row.name.toLocaleLowerCase("pt-BR").includes(search) ||
          row.email.toLocaleLowerCase("pt-BR").includes(search);
        const matchesStatus = data.status === "all" || row.accountStatus === data.status;
        const matchesRole =
          data.role === "all" || (row.platformRole ?? "professional") === data.role;
        return matchesSearch && matchesStatus && matchesRole;
      })
      .sort((a, b) => {
        if (data.sort === "oldest")
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (data.sort === "name") return a.name.localeCompare(b.name, "pt-BR");
        if (data.sort === "last_activity")
          return (
            new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime()
          );
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const start = (data.page - 1) * data.pageSize;
    return {
      rows: rows.slice(start, start + data.pageSize),
      total: rows.length,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

const userDetailInput = z.object({ userId: z.string().uuid() });

export const getAdminUserDetail = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => userDetailInput.parse(input))
  .handler(async ({ data, context }) => {
    const userResult = await context.supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userResult.error || !userResult.data.user) throw new Response("Not found", { status: 404 });
    const user = userResult.data.user;
    const { data: profile, error: profileError } = await context.supabaseAdmin
      .from("profiles")
      .select(
        "account_id, full_name, profession, professional_registry, city, state, phone, care_mode, onboarding_completed, force_password_reset, created_at, account:accounts(id, status, blocked_at, block_reason, access_state_changed_at)",
      )
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError || !profile) throw new Response("Not found", { status: 404 });
    const accountId = profile.account_id;
    const [
      patients,
      appointments,
      documents,
      packages,
      activity,
      subscription,
      support,
      platformAdmin,
    ] = await Promise.all([
      context.supabaseAdmin
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId),
      context.supabaseAdmin
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId),
      context.supabaseAdmin
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId),
      context.supabaseAdmin
        .from("care_packages")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId),
      context.supabaseAdmin
        .from("usage_events")
        .select("id, module, occurred_at")
        .eq("account_id", accountId)
        .order("occurred_at", { ascending: false })
        .limit(10),
      context.supabaseAdmin
        .from("account_subscriptions")
        .select(
          "status, contracted_price_cents, starts_on, next_due_on, plan:subscription_plans(name)",
        )
        .eq("account_id", accountId)
        .maybeSingle(),
      context.supabaseAdmin
        .from("support_tickets")
        .select("id, subject, status, created_at")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabaseAdmin
        .from("platform_admins")
        .select("role, revoked_at")
        .eq("user_id", data.userId)
        .maybeSingle(),
    ]);
    const firstError = [
      patients,
      appointments,
      documents,
      packages,
      activity,
      subscription,
      support,
      platformAdmin,
    ].find((result) => result.error)?.error;
    if (firstError) throw new Error("Não foi possível carregar os indicadores da conta.");
    return {
      id: user.id,
      accountId,
      name: profile.full_name || "Cadastro incompleto",
      email: user.email ?? "E-mail indisponível",
      profession: profile.profession,
      professionalRegistry: profile.professional_registry,
      city: profile.city,
      state: profile.state,
      phone: profile.phone,
      careMode: profile.care_mode,
      forcePasswordReset: profile.force_password_reset,
      accountStatus: profile.account?.status ?? "unknown",
      accountBlocked: Boolean(profile.account?.blocked_at),
      blockReason: profile.account?.block_reason ?? null,
      accessStateChangedAt: profile.account?.access_state_changed_at ?? null,
      onboardingCompleted: profile.onboarding_completed,
      createdAt: profile.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      counts: {
        patients: patients.count ?? 0,
        appointments: appointments.count ?? 0,
        documents: documents.count ?? 0,
        packages: packages.count ?? 0,
      },
      activity: activity.data ?? [],
      subscription: subscription.data ?? null,
      support: support.data ?? [],
      platformRole:
        platformAdmin.data && !platformAdmin.data.revoked_at ? platformAdmin.data.role : null,
    };
  });

const accountStatusInput = z.object({
  accountId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().max(500),
  confirm: z.literal(true),
});

export const setAdminAccountStatus = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => accountStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!["super_admin", "support_admin"].includes(context.platformAdminRole))
      throw new Response("Forbidden", { status: 403 });
    const target = await context.supabaseAdmin
      .from("accounts")
      .select("owner_user_id")
      .eq("id", data.accountId)
      .single();
    if (target.error) throw new Error("Conta não encontrada.");
    const shouldBan = data.status === "suspended";
    const authResult = await context.supabaseAdmin.auth.admin.updateUserById(
      target.data.owner_user_id,
      { ban_duration: shouldBan ? "876000h" : "none" },
    );
    if (authResult.error) throw new Error("Não foi possível atualizar o acesso de autenticação.");
    const { data: changed, error } = await context.supabaseAdmin.rpc("admin_change_account_status", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _reason: data.reason,
      _status: data.status,
    });
    if (error) {
      await context.supabaseAdmin.auth.admin.updateUserById(target.data.owner_user_id, {
        ban_duration: shouldBan ? "none" : "876000h",
      });
      throw new Error(error.message || "Não foi possível alterar a situação da conta.");
    }
    return { ok: true, unchanged: !changed };
  });

const accountBlockInput = z.object({
  accountId: z.string().uuid(),
  blocked: z.boolean(),
  reason: z.string().trim().max(500),
  confirm: z.literal(true),
});

export const setAdminAccountBlock = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => accountBlockInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!["super_admin", "support_admin"].includes(context.platformAdminRole))
      throw new Response("Forbidden", { status: 403 });
    const target = await context.supabaseAdmin
      .from("accounts")
      .select("owner_user_id")
      .eq("id", data.accountId)
      .single();
    if (target.error) throw new Error("Conta não encontrada.");
    const authResult = await context.supabaseAdmin.auth.admin.updateUserById(
      target.data.owner_user_id,
      { ban_duration: data.blocked ? "876000h" : "none" },
    );
    if (authResult.error) throw new Error("Não foi possível atualizar o acesso de autenticação.");
    const { data: changed, error } = await context.supabaseAdmin.rpc(
      "admin_set_account_block",
      {
        _actor_user_id: context.userId,
        _account_id: data.accountId,
        _blocked: data.blocked,
        _reason: data.reason,
      },
    );
    if (error) {
      await context.supabaseAdmin.auth.admin.updateUserById(target.data.owner_user_id, {
        ban_duration: data.blocked ? "none" : "876000h",
      });
      throw new Error(error.message || "Não foi possível alterar o bloqueio da conta.");
    }
    return { ok: true, unchanged: !changed };
  });

const auditListInput = z.object({
  action: z.string().max(120).default(""),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(20),
});

export const listAdminAuditEvents = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => auditListInput.parse(input))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let query = context.supabaseAdmin
      .from("platform_audit_events")
      .select(
        "id, actor_user_id, action, entity_type, entity_id, account_id, changed_fields, result, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.action.trim()) query = query.ilike("action", `%${data.action.trim()}%`);
    const { data: rows, count, error } = await query;
    if (error) throw new Error("Não foi possível carregar a auditoria administrativa.");
    const actorIds = [
      ...new Set((rows ?? []).flatMap((item) => (item.actor_user_id ? [item.actor_user_id] : []))),
    ];
    const { data: profiles } = actorIds.length
      ? await context.supabaseAdmin.from("profiles").select("id, full_name").in("id", actorIds)
      : { data: [] };
    const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    return {
      rows: (rows ?? []).map((item) => ({
        ...item,
        actorName: item.actor_user_id
          ? names.get(item.actor_user_id) || "Administrador"
          : "Sistema",
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
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
    if (plans.error || settings.error)
      throw new Error("Não foi possível carregar as configurações.");
    return { plans: plans.data ?? [], settings: settings.data ?? [] };
  });

const settingInput = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9_.-]+$/),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  description: z.string().trim().max(300).nullable(),
  confirm: z.literal(true),
});
export const upsertAdminSetting = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => settingInput.parse(input))
  .handler(async ({ data, context }) => {
    if (context.platformAdminRole !== "super_admin")
      throw new Response("Forbidden", { status: 403 });
    const { error } = await context.supabaseAdmin.from("commercial_settings").upsert(
      {
        setting_key: data.key,
        value: data.value,
        description: data.description,
        updated_by: context.userId,
      },
      { onConflict: "setting_key" },
    );
    if (error) throw new Error("Não foi possível salvar a configuração.");
    await recordAudit(
      context.supabaseAdmin,
      context.userId,
      "settings.upsert",
      "commercial_setting",
      null,
      null,
      ["value", "description"],
    );
    return { ok: true as const };
  });

const adminRoleInput = z.object({
  userId: z.string().uuid(),
  role: z
    .enum(["super_admin", "support_admin", "analyst", "finance_admin", "content_admin"])
    .nullable(),
  confirm: z.literal(true),
});
export const setPlatformAdminRole = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => adminRoleInput.parse(input))
  .handler(async ({ data, context }) => {
    if (context.platformAdminRole !== "super_admin")
      throw new Response("Forbidden", { status: 403 });
    const { data: changed, error } = await context.supabaseAdmin.rpc("admin_set_platform_role", {
      _actor_user_id: context.userId,
      _role: data.role ?? undefined,
      _target_user_id: data.userId,
    });
    if (error) throw new Error(error.message || "Não foi possível alterar a permissão.");
    return { ok: true as const, unchanged: !changed };
  });

const paymentActionInput = z.object({ paymentId: z.string().uuid(), confirm: z.literal(true) });

export const confirmAdminPayment = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => paymentActionInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!["super_admin", "finance_admin"].includes(context.platformAdminRole))
      throw new Response("Forbidden", { status: 403 });
    const { data: changed, error } = await context.supabaseAdmin.rpc("admin_confirm_payment", {
      _actor_user_id: context.userId,
      _payment_id: data.paymentId,
    });
    if (error) throw new Error(error.message || "Não foi possível confirmar o pagamento.");
    return { ok: true, unchanged: !changed };
  });
