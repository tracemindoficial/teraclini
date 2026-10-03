import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const operationalRoles = ["super_admin", "support_admin"] as const;
const financialRoles = ["super_admin", "finance_admin"] as const;
type PlatformRole = Database["public"]["Enums"]["platform_admin_role"];

const requireOperationalAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admin, error } = await supabaseAdmin
      .from("platform_admins")
      .select("role, revoked_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !admin || admin.revoked_at) throw new Response("Forbidden", { status: 403 });
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("status, blocked_at")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!account || account.status !== "active" || account.blocked_at)
      throw new Response("Forbidden", { status: 403 });
    return next({ context: { ...context, supabaseAdmin, platformAdminRole: admin.role } });
  });

function assertRole(role: PlatformRole, allowed: readonly PlatformRole[]) {
  if (!allowed.includes(role)) throw new Response("Forbidden", { status: 403 });
}

async function audit(
  client: SupabaseClient<Database>,
  actor: string,
  action: string,
  entityType: string,
  entityId: string | null,
  accountId: string | null,
  changedFields: string[],
  result = "success",
) {
  const { error } = await client.from("platform_audit_events").insert({
    actor_user_id: actor,
    action,
    entity_type: entityType,
    entity_id: entityId,
    account_id: accountId,
    changed_fields: changedFields,
    result,
  });
  if (error) throw new Error("Não foi possível registrar a auditoria administrativa.");
}

async function accountForUser(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("account:accounts(id, status)")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.account) throw new Error("Conta não encontrada.");
  return data.account;
}

const profileInput = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(160),
  profession: z.string().trim().max(120).nullable(),
  professionalRegistry: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(120).nullable(),
  state: z.string().trim().max(60).nullable(),
  phone: z.string().trim().max(30).nullable(),
  careMode: z.enum(["presencial", "online", "ambos"]).nullable(),
  confirm: z.literal(true),
});

export const updateAdminUserProfile = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => profileInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    const { data: changed, error } = await context.supabaseAdmin.rpc("admin_update_user_profile", {
      _actor_user_id: context.userId,
      _target_user_id: data.userId,
      _full_name: data.fullName,
      _profession: data.profession ?? "",
      _professional_registry: data.professionalRegistry ?? "",
      _city: data.city ?? "",
      _state: data.state ?? "",
      _care_mode: data.careMode as Database["public"]["Enums"]["care_mode"],
      _phone: data.phone ?? "",
    });
    if (error) throw new Error(error.message || "Não foi possível atualizar os dados do usuário.");
    return { ok: true as const, unchanged: !changed };
  });

const inviteUserInput = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).nullable(),
  role: z
    .enum(["professional", "support_admin", "analyst", "finance_admin", "content_admin"])
    .default("professional"),
  confirm: z.literal(true),
});

export const inviteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => inviteUserInput.parse(input))
  .handler(async ({ data, context }) => {
    if (context.platformAdminRole !== "super_admin")
      throw new Response("Forbidden", { status: 403 });

    const request = getRequest();
    const origin = request ? new URL(request.url).origin : "";
    const invited = await context.supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.fullName },
      redirectTo: `${origin}/reset-password`,
    });
    if (invited.error || !invited.data.user) {
      const message = invited.error?.message.toLowerCase() ?? "";
      if (message.includes("already") || message.includes("registered"))
        throw new Error("Já existe uma conta com este e-mail.");
      throw new Error("Não foi possível enviar o convite.");
    }

    const invitedUserId = invited.data.user.id;
    try {
      const { data: profile, error: profileError } = await context.supabaseAdmin
        .from("profiles")
        .update({ full_name: data.fullName, phone: data.phone })
        .eq("id", invitedUserId)
        .select("account_id")
        .single();
      if (profileError || !profile) throw new Error("O perfil do convite não foi criado.");

      if (data.role !== "professional") {
        const { error: roleError } = await context.supabaseAdmin.rpc("admin_set_platform_role_v2", {
          _actor_user_id: context.userId,
          _target_user_id: invitedUserId,
          _role: data.role,
        });
        if (roleError) throw new Error(roleError.message);
      }

      await audit(
        context.supabaseAdmin,
        context.userId,
        "user.invite",
        "user",
        invitedUserId,
        profile.account_id,
        ["email", "full_name", "phone", "role"],
      );
      return { ok: true as const, userId: invitedUserId };
    } catch (error) {
      await context.supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      throw error;
    }
  });

const deletionInput = z.object({ userId: z.string().uuid() });

async function deletionPreview(client: SupabaseClient<Database>, userId: string) {
  const userResult = await client.auth.admin.getUserById(userId);
  if (userResult.error || !userResult.data.user) throw new Error("Usuário não encontrado.");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("account_id, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) throw new Error("Perfil não encontrado.");
  const accountId = profile.account_id;
  const [patients, appointments, documents, packages, payments, subscriptions, support, admin] =
    await Promise.all([
      client.from("patients").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("appointments").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("documents").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("care_packages").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("payments").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("account_subscriptions").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("support_tickets").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      client.from("platform_admins").select("role, revoked_at").eq("user_id", userId).maybeSingle(),
    ]);
  const results = [patients, appointments, documents, packages, payments, subscriptions, support];
  if (results.some((result) => result.error) || admin.error)
    throw new Error("Não foi possível verificar as dependências da conta.");
  const counts = {
    patients: patients.count ?? 0,
    appointments: appointments.count ?? 0,
    documents: documents.count ?? 0,
    packages: packages.count ?? 0,
    payments: payments.count ?? 0,
    subscriptions: subscriptions.count ?? 0,
    support: support.count ?? 0,
  };
  const hasDependencies = Object.values(counts).some((count) => count > 0);
  const isAdmin = Boolean(admin.data && !admin.data.revoked_at);
  return {
    userId,
    accountId,
    name: profile.full_name,
    email: userResult.data.user.email ?? "E-mail indisponível",
    counts,
    isAdmin,
    canDelete: !hasDependencies && !isAdmin,
    reason: isAdmin
      ? "Contas administrativas devem ser preservadas."
      : hasDependencies
        ? "A conta possui dados que exigem preservação. Use a desativação."
        : null,
  };
}

export const getAdminUserDeletionPreview = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => deletionInput.parse(input))
  .handler(async ({ data, context }) => {
    if (context.platformAdminRole !== "super_admin")
      throw new Response("Forbidden", { status: 403 });
    return deletionPreview(context.supabaseAdmin, data.userId);
  });

export const deleteEmptyAdminUser = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) =>
    deletionInput
      .extend({ confirmation: z.string().trim().min(1).max(254), confirm: z.literal(true) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (context.platformAdminRole !== "super_admin")
      throw new Response("Forbidden", { status: 403 });
    if (data.userId === context.userId) throw new Error("Você não pode excluir sua própria conta.");
    const preview = await deletionPreview(context.supabaseAdmin, data.userId);
    if (!preview.canDelete) throw new Error(preview.reason ?? "Esta conta não pode ser excluída.");
    if (data.confirmation.toLowerCase() !== preview.email.toLowerCase())
      throw new Error("A confirmação não corresponde ao e-mail da conta.");

    const deleted = await context.supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (deleted.error) throw new Error("Não foi possível excluir a identidade de acesso.");
    const { error: accountError } = await context.supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", preview.accountId);
    if (accountError) {
      console.error("Empty user account cleanup failed after identity deletion");
      throw new Error("A identidade foi removida, mas a limpeza da conta exige revisão administrativa.");
    }
    await audit(
      context.supabaseAdmin,
      context.userId,
      "user.delete_empty",
      "user",
      data.userId,
      null,
      ["auth_identity", "empty_account"],
    );
    return { ok: true as const };
  });

const emailInput = z.object({
  userId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  confirm: z.literal(true),
});
export const updateAdminUserEmail = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => emailInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const current = await context.supabaseAdmin.auth.admin.getUserById(data.userId);
    if (current.error || !current.data.user) throw new Error("Usuário não encontrado.");
    if (current.data.user.email?.toLowerCase() === data.email.toLowerCase())
      return { ok: true as const, unchanged: true };
    const updated = await context.supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (updated.error) {
      if (updated.error.message.toLowerCase().includes("already"))
        throw new Error("Este e-mail já está em uso.");
      throw new Error("Não foi possível alterar o e-mail.");
    }
    const { error: accessEventError } = await context.supabaseAdmin
      .from("account_access_events")
      .insert({
        account_id: account.id,
        user_id: data.userId,
        actor_user_id: context.userId,
        event_type: "email_changed",
        details: { previous_email_domain: current.data.user.email?.split("@")[1] ?? null },
      });
    if (accessEventError) console.error("Admin email access history write failed");
    try {
      await audit(
        context.supabaseAdmin,
        context.userId,
        "user.email_change",
        "user",
        data.userId,
        account.id,
        ["email"],
      );
    } catch {
      console.error("Admin email audit write failed");
    }
    return { ok: true as const, unchanged: false };
  });

const accessInput = z.object({ userId: z.string().uuid(), confirm: z.literal(true) });
async function sendRecovery(
  context: {
    supabaseAdmin: SupabaseClient<Database>;
    userId: string;
    platformAdminRole: PlatformRole;
  },
  targetUserId: string,
  eventType: "password_reset_sent" | "access_instructions_sent",
) {
  assertRole(context.platformAdminRole, operationalRoles);
  const account = await accountForUser(context.supabaseAdmin, targetUserId);
  const userResult = await context.supabaseAdmin.auth.admin.getUserById(targetUserId);
  const email = userResult.data.user?.email;
  if (userResult.error || !email) throw new Error("Usuário sem e-mail disponível.");
  const request = getRequest();
  const origin = request ? new URL(request.url).origin : "";
  const result = await context.supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (result.error) throw new Error("Não foi possível enviar as instruções de acesso.");
  await context.supabaseAdmin.from("account_access_events").insert({
    account_id: account.id,
    user_id: targetUserId,
    actor_user_id: context.userId,
    event_type: eventType,
    details: {},
  });
  await audit(
    context.supabaseAdmin,
    context.userId,
    `access.${eventType}`,
    "user",
    targetUserId,
    account.id,
    [],
  );
  return { ok: true as const };
}

export const sendAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) => sendRecovery(context, data.userId, "password_reset_sent"));

export const resendAdminAccessInstructions = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) =>
    sendRecovery(context, data.userId, "access_instructions_sent"),
  );

export const requireAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const now = new Date().toISOString();
    const { error } = await context.supabaseAdmin
      .from("profiles")
      .update({ force_password_reset: true, password_reset_required_at: now })
      .eq("id", data.userId);
    if (error) throw new Error("Não foi possível exigir a redefinição.");
    await context.supabaseAdmin.from("account_access_events").insert({
      account_id: account.id,
      user_id: data.userId,
      actor_user_id: context.userId,
      event_type: "password_reset_required",
      details: {},
    });
    await audit(
      context.supabaseAdmin,
      context.userId,
      "access.password_reset_required",
      "user",
      data.userId,
      account.id,
      ["force_password_reset"],
    );
    return { ok: true as const };
  });

export const completeRequiredPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("account_id, force_password_reset")
      .eq("id", context.userId)
      .single();
    if (profileError || !profile) throw new Error("Perfil não encontrado.");
    if (!profile.force_password_reset) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ force_password_reset: false, password_reset_required_at: null })
      .eq("id", context.userId);
    if (error) throw new Error("Não foi possível concluir a redefinição obrigatória.");
    await supabaseAdmin.from("account_access_events").insert({
      account_id: profile.account_id,
      user_id: context.userId,
      actor_user_id: context.userId,
      event_type: "password_changed",
      details: {},
    });
    return { ok: true as const };
  });

const historyInput = z.object({ userId: z.string().uuid() });
export const getAdminUserHistory = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => historyInput.parse(input))
  .handler(async ({ data, context }) => {
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const [auditRows, accessRows, subscriptionRows] = await Promise.all([
      context.supabaseAdmin
        .from("platform_audit_events")
        .select("id, action, changed_fields, result, details, created_at")
        .or(`entity_id.eq.${data.userId},account_id.eq.${account.id}`)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabaseAdmin
        .from("account_access_events")
        .select("id, event_type, created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabaseAdmin
        .from("subscription_events")
        .select("id, event_type, previous_status, new_status, created_at")
        .eq("account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (auditRows.error || accessRows.error || subscriptionRows.error)
      throw new Error("Não foi possível carregar o histórico.");
    const auditReason = (
      details: Database["public"]["Tables"]["platform_audit_events"]["Row"]["details"],
    ) => {
      if (!details || Array.isArray(details) || typeof details !== "object") return null;
      const reason = details["reason"];
      return typeof reason === "string" ? reason : null;
    };
    return [
      ...(auditRows.data ?? []).map((item) => ({
        id: `audit-${item.id}`,
        type: item.action,
        detail: auditReason(item.details)
          ? `${item.changed_fields.join(", ")} — ${auditReason(item.details)}`
          : item.changed_fields.join(", "),
        createdAt: item.created_at,
      })),
      ...(accessRows.data ?? []).map((item) => ({
        id: `access-${item.id}`,
        type: item.event_type,
        detail: "Acesso e segurança",
        createdAt: item.created_at,
      })),
      ...(subscriptionRows.data ?? []).map((item) => ({
        id: `subscription-${item.id}`,
        type: item.event_type,
        detail: [item.previous_status, item.new_status].filter(Boolean).join(" → "),
        createdAt: item.created_at,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

const subscriptionInput = z.object({
  accountId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  action: z.enum([
    "create",
    "change_plan",
    "activate",
    "restrict",
    "extend",
    "cancel",
    "reactivate",
  ]),
  days: z.number().int().min(1).max(365).optional(),
  confirm: z.literal(true),
});
export const manageAdminSubscription = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => subscriptionInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, financialRoles);
    const rpcInput: {
      _actor_user_id: string;
      _account_id: string;
      _action: string;
      _plan_id?: string;
      _days?: number;
    } = {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _action: data.action,
    };
    if (data.planId) rpcInput._plan_id = data.planId;
    if (data.days !== undefined) rpcInput._days = data.days;
    const { data: subscriptionId, error } = await context.supabaseAdmin.rpc(
      "admin_manage_subscription",
      rpcInput,
    );
    if (error || !subscriptionId)
      throw new Error(error?.message ?? "Não foi possível atualizar a licença.");
    return { ok: true as const };
  });

export const getAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireOperationalAdmin])
  .handler(async ({ context }) => {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const [accounts, tickets, subscriptions, payments, reads] = await Promise.all([
      context.supabaseAdmin
        .from("accounts")
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabaseAdmin
        .from("support_tickets")
        .select("id, subject, status, priority, last_message_at")
        .in("status", ["open", "in_progress", "waiting_user"])
        .order("last_message_at", { ascending: false })
        .limit(30),
      context.supabaseAdmin
        .from("account_subscriptions")
        .select("id, account_id, status, next_due_on, account:accounts(name)")
        .lte("next_due_on", in30.toISOString().slice(0, 10))
        .neq("status", "cancelled")
        .order("next_due_on")
        .limit(30),
      context.supabaseAdmin
        .from("payments")
        .select("id, account_id, status, due_on, account:accounts(name)")
        .in("status", ["pending", "under_review", "overdue"])
        .order("due_on")
        .limit(30),
      context.supabaseAdmin
        .from("admin_notification_reads")
        .select("notification_key")
        .eq("admin_user_id", context.userId),
    ]);
    if (accounts.error || tickets.error || subscriptions.error || payments.error || reads.error)
      throw new Error("Não foi possível carregar os alertas.");
    const read = new Set((reads.data ?? []).map((item) => item.notification_key));
    const items = [
      ...(accounts.data ?? [])
        .filter((a) => new Date(a.created_at).getTime() >= now.getTime() - 7 * 86400000)
        .map((a) => ({
          key: `account:${a.id}`,
          kind: "account",
          title: "Novo cadastro",
          detail: a.name,
          date: a.created_at,
          to: `/admin/usuarios/${a.id}`,
        })),
      ...(accounts.data ?? [])
        .filter((a) => a.status === "suspended")
        .map((a) => ({
          key: `suspended:${a.id}`,
          kind: "account",
          title: "Conta suspensa",
          detail: a.name,
          date: a.created_at,
          to: `/admin/usuarios/${a.id}`,
        })),
      ...(tickets.data ?? []).map((t) => ({
        key: `ticket:${t.id}:${t.last_message_at}`,
        kind: "support",
        title: t.priority === "urgent" ? "Chamado urgente" : "Chamado pendente",
        detail: t.subject,
        date: t.last_message_at,
        to: `/admin/suporte?ticket=${t.id}`,
      })),
      ...(subscriptions.data ?? []).map((s) => ({
        key: `subscription:${s.id}:${s.next_due_on}`,
        kind: "subscription",
        title: "Licença próxima do vencimento",
        detail: s.account?.name ?? "Conta",
        date: `${s.next_due_on}T12:00:00Z`,
        to: `/admin/assinaturas?account=${s.account_id}`,
      })),
      ...(payments.data ?? []).map((p) => ({
        key: `payment:${p.id}:${p.status}`,
        kind: "payment",
        title: p.status === "overdue" ? "Pagamento vencido" : "Pagamento pendente",
        detail: p.account?.name ?? "Conta",
        date: `${p.due_on}T12:00:00Z`,
        to: `/admin/pagamentos?payment=${p.id}`,
      })),
    ]
      .map((item) => ({ ...item, read: read.has(item.key) }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return items;
  });

export const listAdminSubscriptionPlans = createServerFn({ method: "GET" })
  .middleware([requireOperationalAdmin])
  .handler(async ({ context }) => {
    assertRole(context.platformAdminRole, financialRoles);
    const { data, error } = await context.supabaseAdmin
      .from("subscription_plans")
      .select("id, name, code, price_cents, currency, is_active")
      .order("price_cents");
    if (error) throw new Error("Não foi possível carregar os planos.");
    return data ?? [];
  });

const notificationInput = z.object({ key: z.string().min(3).max(220) });
export const markAdminNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => notificationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin.from("admin_notification_reads").upsert(
      {
        admin_user_id: context.userId,
        notification_key: data.key,
        read_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id,notification_key" },
    );
    if (error) throw new Error("Não foi possível dispensar o alerta.");
    return { ok: true as const };
  });

export const markAllAdminNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) =>
    z.object({ keys: z.array(z.string().min(3).max(220)).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.keys.length) return { ok: true as const };
    const readAt = new Date().toISOString();
    const { error } = await context.supabaseAdmin.from("admin_notification_reads").upsert(
      data.keys.map((key) => ({
        admin_user_id: context.userId,
        notification_key: key,
        read_at: readAt,
      })),
      { onConflict: "admin_user_id,notification_key" },
    );
    if (error) throw new Error("Não foi possível marcar os alertas como lidos.");
    return { ok: true as const };
  });
