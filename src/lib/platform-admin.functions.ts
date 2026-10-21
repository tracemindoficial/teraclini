import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminDirectoryResult, adminOverviewResult } from "@/lib/admin-client-rules";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { confirmedRevenue, expectedRevenue, type PaymentMetric } from "@/lib/admin-metrics";
import type { SupabaseClient } from "@supabase/supabase-js";

export const requirePlatformAdmin = createMiddleware({ type: "function" })
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
      .select("status, blocked_at")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!account || account.status !== "active" || account.blocked_at)
      throw new Response("Forbidden", { status: 403 });
    return next({
      context: {
        ...context,
        supabaseAdmin,
        platformAdminId: data.id,
        platformAdminRole: data.role,
      },
    });
  });

const clientDirectoryRoles: Database["public"]["Enums"]["platform_admin_role"][] = [
  "super_admin",
  "support_admin",
];

function assertClientDirectoryAccess(
  role: Database["public"]["Enums"]["platform_admin_role"],
) {
  if (!clientDirectoryRoles.includes(role)) throw new Response("Forbidden", { status: 403 });
}

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
    const result = await context.supabaseAdmin.rpc("admin_overview_summary", { _actor_user_id: context.userId });
    if (result.error) throw new Error("Não foi possível carregar a visão administrativa.");
    return adminOverviewResult.parse(result.data);
  });

const userListInput = z.object({
  search: z.string().max(120).default(""),
  status: z.enum(["all", "active", "suspended", "closed", "blocked"]).default("all"),
  payment: z.enum(["all", "confirmed", "pending", "overdue", "none"]).default("all"),
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
    assertClientDirectoryAccess(context.platformAdminRole);
    const result = await context.supabaseAdmin.rpc("admin_client_directory", {
      _actor_user_id: context.userId, _search: data.search, _status: data.status,
      _payment: data.payment, _role: data.role, _sort: data.sort,
      _page: data.page, _page_size: data.pageSize,
    });
    if (result.error) throw new Error("Não foi possível carregar o diretório administrativo.");
    return adminDirectoryResult.parse(result.data);
  });

const userDetailInput = z.object({ userId: z.string().uuid() });

export const getAdminUserDetail = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((input) => userDetailInput.parse(input))
  .handler(async ({ data, context }) => {
    assertClientDirectoryAccess(context.platformAdminRole);
    const userResult = await context.supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userResult.error || !userResult.data.user) throw new Response("Not found", { status: 404 });
    const user = userResult.data.user;
    const { data: profile, error: profileError } = await context.supabaseAdmin
      .from("profiles")
      .select(
        "account_id, full_name, profession, professional_registry, city, state, phone, care_mode, onboarding_completed, force_password_reset, created_at",
      )
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError) throw new Error("Não foi possível carregar o perfil cadastral.");
    const { data: account, error: accountError } = await context.supabaseAdmin
      .from("accounts")
      .select("id, status, blocked_at, block_reason, access_state_changed_at")
      .eq("owner_user_id", data.userId)
      .maybeSingle();
    if (accountError) throw new Error("Não foi possível carregar a conta profissional.");
    const accountId = profile?.account_id ?? account?.id ?? null;

    if (!accountId) {
      return {
        id: user.id,
        accountId: null,
        profileExists: false,
        name:
          (typeof user.user_metadata?.["full_name"] === "string"
            ? user.user_metadata["full_name"]
            : null) || "Cadastro incompleto",
        email: user.email ?? "E-mail indisponível",
        profession: null,
        professionalRegistry: null,
        city: null,
        state: null,
        phone: null,
        careMode: null,
        forcePasswordReset: false,
        accountStatus: "missing",
        accountBlocked: false,
        blockReason: null,
        accessStateChangedAt: null,
        onboardingCompleted: false,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        counts: { patients: 0, appointments: 0, documents: 0, packages: 0 },
        activity: [],
        subscription: null,
        support: [],
        platformRole: null,
        payments: [],
        specialties: [],
      };
    }
    const [
      patients,
      appointments,
      documents,
      packages,
      activity,
      subscription,
      support,
      platformAdmin,
      payments,
      specialties,
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
      context.supabaseAdmin
        .from("payments")
        .select(
          "id, amount_cents, currency, due_on, paid_at, method, status, transaction_id, charge_id, confirmation_source, confirmed_at, updated_at",
        )
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabaseAdmin
        .from("profile_specialties")
        .select("specialty:specialties(name)")
        .eq("profile_id", data.userId),
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
      payments,
      specialties,
    ].find((result) => result.error)?.error;
    if (firstError) throw new Error("Não foi possível carregar os indicadores da conta.");
    return {
      id: user.id,
      accountId,
      profileExists: Boolean(profile),
      name: profile?.full_name || "Cadastro incompleto",
      email: user.email ?? "E-mail indisponível",
      profession: profile?.profession ?? null,
      professionalRegistry: profile?.professional_registry ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      phone: profile?.phone ?? null,
      careMode: profile?.care_mode ?? null,
      forcePasswordReset: profile?.force_password_reset ?? false,
      accountStatus: account?.status ?? "unknown",
      accountBlocked: Boolean(account?.blocked_at),
      blockReason: account?.block_reason ?? null,
      accessStateChangedAt: account?.access_state_changed_at ?? null,
      onboardingCompleted: profile?.onboarding_completed ?? false,
      createdAt: profile?.created_at ?? user.created_at,
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
      payments: payments.data ?? [],
      specialties: (specialties.data ?? []).flatMap((item) =>
        item.specialty?.name ? [item.specialty.name] : [],
      ),
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
      .select("owner_user_id, status, blocked_at")
      .eq("id", data.accountId)
      .single();
    if (target.error) throw new Error("Conta não encontrada.");
    const wasBanned = target.data.status !== "active" || Boolean(target.data.blocked_at);
    const shouldBan = data.status === "suspended" || Boolean(target.data.blocked_at);
    const authResult = await context.supabaseAdmin.auth.admin.updateUserById(
      target.data.owner_user_id,
      { ban_duration: shouldBan ? "876000h" : "none" },
    );
    if (authResult.error) throw new Error("Não foi possível atualizar o acesso de autenticação.");
    const { data: changed, error } = await context.supabaseAdmin.rpc(
      "admin_change_account_status",
      {
        _actor_user_id: context.userId,
        _account_id: data.accountId,
        _reason: data.reason,
        _status: data.status,
      },
    );
    if (error) {
      await context.supabaseAdmin.auth.admin.updateUserById(target.data.owner_user_id, {
        ban_duration: wasBanned ? "876000h" : "none",
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
      .select("owner_user_id, status, blocked_at")
      .eq("id", data.accountId)
      .single();
    if (target.error) throw new Error("Conta não encontrada.");
    const wasBanned = target.data.status !== "active" || Boolean(target.data.blocked_at);
    const shouldBan = data.blocked || target.data.status !== "active";
    const authResult = await context.supabaseAdmin.auth.admin.updateUserById(
      target.data.owner_user_id,
      { ban_duration: shouldBan ? "876000h" : "none" },
    );
    if (authResult.error) throw new Error("Não foi possível atualizar o acesso de autenticação.");
    const { data: changed, error } = await context.supabaseAdmin.rpc("admin_set_account_block", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _blocked: data.blocked,
      _reason: data.reason,
    });
    if (error) {
      await context.supabaseAdmin.auth.admin.updateUserById(target.data.owner_user_id, {
        ban_duration: wasBanned ? "876000h" : "none",
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
    const { data: changed, error } = await context.supabaseAdmin.rpc("admin_set_platform_role_v2", {
      _actor_user_id: context.userId,
      _role: data.role as string,
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
