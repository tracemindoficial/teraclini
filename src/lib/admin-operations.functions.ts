import { createMiddleware, createServerFn, getRequest } from "@tanstack/react-start";
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
      .select("status")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!account || account.status !== "active") throw new Response("Forbidden", { status: 403 });
    return next({ context: { ...context, supabaseAdmin, platformAdminRole: admin.role } });
  });

function assertRole(role: PlatformRole, allowed: readonly PlatformRole[]) {
  if (!allowed.includes(role)) throw new Response("Forbidden", { status: 403 });
}

async function audit(
  client: SupabaseClient<Database>, actor: string, action: string, entityType: string,
  entityId: string | null, accountId: string | null, changedFields: string[], result = "success",
) {
  const { error } = await client.from("platform_audit_events").insert({
    actor_user_id: actor, action, entity_type: entityType, entity_id: entityId,
    account_id: accountId, changed_fields: changedFields, result,
  });
  if (error) throw new Error("Não foi possível registrar a auditoria administrativa.");
}

async function accountForUser(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.from("accounts").select("id, status").eq("owner_user_id", userId).maybeSingle();
  if (error || !data) throw new Error("Conta não encontrada.");
  return data;
}

const profileInput = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(160),
  profession: z.string().trim().max(120).nullable(),
  professionalRegistry: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(120).nullable(),
  state: z.string().trim().max(60).nullable(),
  careMode: z.enum(["presencial", "online", "ambos"]).nullable(),
  confirm: z.literal(true),
});

export const updateAdminUserProfile = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => profileInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const { data: previous, error: readError } = await context.supabaseAdmin
      .from("profiles")
      .select("full_name, profession, professional_registry, city, state, care_mode")
      .eq("id", data.userId).single();
    if (readError) throw new Error("Cadastro não encontrado.");
    const next = {
      full_name: data.fullName, profession: data.profession,
      professional_registry: data.professionalRegistry, city: data.city,
      state: data.state, care_mode: data.careMode,
    };
    const changed = Object.keys(next).filter((key) => previous[key as keyof typeof previous] !== next[key as keyof typeof next]);
    if (!changed.length) return { ok: true as const, unchanged: true };
    const { error } = await context.supabaseAdmin.from("profiles").update(next).eq("id", data.userId);
    if (error) throw new Error("Não foi possível atualizar o cadastro.");
    await audit(context.supabaseAdmin, context.userId, "user.profile_update", "user", data.userId, account.id, changed);
    return { ok: true as const, unchanged: false };
  });

const emailInput = z.object({ userId: z.string().uuid(), email: z.string().trim().email().max(254), confirm: z.literal(true) });
export const updateAdminUserEmail = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => emailInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const current = await context.supabaseAdmin.auth.admin.getUserById(data.userId);
    if (current.error || !current.data.user) throw new Error("Usuário não encontrado.");
    if (current.data.user.email?.toLowerCase() === data.email.toLowerCase()) return { ok: true as const, unchanged: true };
    for (let page = 1; page <= 100; page += 1) {
      const users = await context.supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (users.error) throw new Error("Não foi possível validar o novo e-mail.");
      if (users.data.users.some((user) => user.id !== data.userId && user.email?.toLowerCase() === data.email.toLowerCase())) {
        throw new Error("Este e-mail já está em uso.");
      }
      if (users.data.users.length < 1000) break;
    }
    const updated = await context.supabaseAdmin.auth.admin.updateUserById(data.userId, { email: data.email, email_confirm: true });
    if (updated.error) throw new Error("Não foi possível alterar o e-mail.");
    await context.supabaseAdmin.from("account_access_events").insert({
      account_id: account.id, user_id: data.userId, actor_user_id: context.userId,
      event_type: "email_changed", details: { previous_email_domain: current.data.user.email?.split("@")[1] ?? null },
    });
    await audit(context.supabaseAdmin, context.userId, "user.email_change", "user", data.userId, account.id, ["email"]);
    return { ok: true as const, unchanged: false };
  });

const accessInput = z.object({ userId: z.string().uuid(), confirm: z.literal(true) });
async function sendRecovery(
  context: { supabaseAdmin: SupabaseClient<Database>; userId: string; platformAdminRole: PlatformRole },
  targetUserId: string, eventType: "password_reset_sent" | "access_instructions_sent",
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
    account_id: account.id, user_id: targetUserId, actor_user_id: context.userId,
    event_type: eventType, details: {},
  });
  await audit(context.supabaseAdmin, context.userId, `access.${eventType}`, "user", targetUserId, account.id, []);
  return { ok: true as const };
}

export const sendAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) => sendRecovery(context, data.userId, "password_reset_sent"));

export const resendAdminAccessInstructions = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) => sendRecovery(context, data.userId, "access_instructions_sent"));

export const requireAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const now = new Date().toISOString();
    const { error } = await context.supabaseAdmin.from("profiles").update({ force_password_reset: true, password_reset_required_at: now }).eq("id", data.userId);
    if (error) throw new Error("Não foi possível exigir a redefinição.");
    await context.supabaseAdmin.from("account_access_events").insert({ account_id: account.id, user_id: data.userId, actor_user_id: context.userId, event_type: "password_reset_required", details: {} });
    await audit(context.supabaseAdmin, context.userId, "access.password_reset_required", "user", data.userId, account.id, ["force_password_reset"]);
    return { ok: true as const };
  });

export const revokeAdminUserSessions = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => accessInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, operationalRoles);
    if (data.userId === context.userId) throw new Error("Use Sair para encerrar sua própria sessão.");
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const userResult = await context.supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userResult.error || !userResult.data.user) throw new Error("Usuário não encontrado.");
    const temporaryBan = await context.supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "1s" });
    if (temporaryBan.error) throw new Error("Não foi possível revogar as sessões.");
    const restore = await context.supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
    if (restore.error) throw new Error("As sessões foram revogadas, mas o acesso precisa ser reativado manualmente.");
    await context.supabaseAdmin.from("account_access_events").insert({ account_id: account.id, user_id: data.userId, actor_user_id: context.userId, event_type: "sessions_revoked", details: {} });
    await audit(context.supabaseAdmin, context.userId, "access.sessions_revoked", "user", data.userId, account.id, []);
    return { ok: true as const };
  });

const historyInput = z.object({ userId: z.string().uuid() });
export const getAdminUserHistory = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => historyInput.parse(input))
  .handler(async ({ data, context }) => {
    const account = await accountForUser(context.supabaseAdmin, data.userId);
    const [auditRows, accessRows, subscriptionRows] = await Promise.all([
      context.supabaseAdmin.from("platform_audit_events").select("id, action, changed_fields, result, created_at").or(`entity_id.eq.${data.userId},account_id.eq.${account.id}`).order("created_at", { ascending: false }).limit(50),
      context.supabaseAdmin.from("account_access_events").select("id, event_type, created_at").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      context.supabaseAdmin.from("subscription_events").select("id, event_type, previous_status, new_status, created_at").eq("account_id", account.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (auditRows.error || accessRows.error || subscriptionRows.error) throw new Error("Não foi possível carregar o histórico.");
    return [
      ...(auditRows.data ?? []).map((item) => ({ id: `audit-${item.id}`, type: item.action, detail: item.changed_fields.join(", "), createdAt: item.created_at })),
      ...(accessRows.data ?? []).map((item) => ({ id: `access-${item.id}`, type: item.event_type, detail: "Acesso e segurança", createdAt: item.created_at })),
      ...(subscriptionRows.data ?? []).map((item) => ({ id: `subscription-${item.id}`, type: item.event_type, detail: [item.previous_status, item.new_status].filter(Boolean).join(" → "), createdAt: item.created_at })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

const subscriptionInput = z.object({
  accountId: z.string().uuid(), planId: z.string().uuid().optional(),
  action: z.enum(["create", "change_plan", "activate", "restrict", "extend", "cancel", "reactivate"]),
  days: z.number().int().min(1).max(365).optional(), confirm: z.literal(true),
});
export const manageAdminSubscription = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => subscriptionInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRole(context.platformAdminRole, financialRoles);
    const { data: current, error: currentError } = await context.supabaseAdmin.from("account_subscriptions").select("*").eq("account_id", data.accountId).maybeSingle();
    if (currentError) throw new Error("Não foi possível carregar a licença.");
    const now = new Date();
    let subscriptionId = current?.id ?? null;
    let previousStatus = current?.status ?? null;
    let nextStatus = current?.status ?? null;
    const changed: string[] = [];
    if (data.action === "create") {
      if (current) throw new Error("Esta conta já possui uma licença.");
      if (!data.planId) throw new Error("Selecione um plano.");
      const { data: plan, error: planError } = await context.supabaseAdmin.from("subscription_plans").select("id, price_cents, currency, first_payment_days").eq("id", data.planId).single();
      if (planError || !plan) throw new Error("Plano não encontrado.");
      const due = new Date(now); due.setDate(due.getDate() + plan.first_payment_days);
      const { data: created, error } = await context.supabaseAdmin.from("account_subscriptions").insert({ account_id: data.accountId, plan_id: plan.id, contracted_price_cents: plan.price_cents, currency: plan.currency, starts_on: now.toISOString().slice(0, 10), next_due_on: due.toISOString().slice(0, 10), billing_period: now.toISOString().slice(0, 10), status: "awaiting_first_payment" }).select("id").single();
      if (error || !created) throw new Error("Não foi possível criar a licença.");
      subscriptionId = created.id; nextStatus = "awaiting_first_payment"; changed.push("plan_id", "status", "starts_on", "next_due_on");
    } else {
      if (!current || !subscriptionId) throw new Error("Licença não encontrada.");
      const patch: Database["public"]["Tables"]["account_subscriptions"]["Update"] = {};
      if (data.action === "change_plan") {
        if (!data.planId) throw new Error("Selecione um plano.");
        const { data: plan, error } = await context.supabaseAdmin.from("subscription_plans").select("id, price_cents, currency").eq("id", data.planId).single();
        if (error || !plan) throw new Error("Plano não encontrado.");
        patch.plan_id = plan.id; patch.contracted_price_cents = plan.price_cents; patch.currency = plan.currency; changed.push("plan_id", "contracted_price_cents", "currency");
      }
      if (["activate", "reactivate"].includes(data.action)) { patch.status = "active"; patch.cancelled_at = null; patch.cancellation_requested_at = null; patch.restricted_at = null; nextStatus = "active"; changed.push("status"); }
      if (data.action === "restrict") { patch.status = "restricted"; patch.restricted_at = now.toISOString(); nextStatus = "restricted"; changed.push("status", "restricted_at"); }
      if (data.action === "cancel") { patch.status = "cancelled"; patch.cancellation_requested_at = now.toISOString(); patch.cancelled_at = now.toISOString(); nextStatus = "cancelled"; changed.push("status", "cancelled_at"); }
      if (data.action === "extend") { const due = new Date(`${current.next_due_on}T12:00:00`); due.setDate(due.getDate() + (data.days ?? 0)); patch.next_due_on = due.toISOString().slice(0, 10); changed.push("next_due_on"); }
      const { error } = await context.supabaseAdmin.from("account_subscriptions").update(patch).eq("id", subscriptionId);
      if (error) throw new Error("Não foi possível atualizar a licença.");
    }
    const { error: eventError } = await context.supabaseAdmin.from("subscription_events").insert({ subscription_id: subscriptionId, account_id: data.accountId, actor_user_id: context.userId, event_type: data.action, previous_status: previousStatus, new_status: nextStatus, changed_fields: changed });
    if (eventError) throw new Error("A licença foi alterada, mas o histórico não foi registrado.");
    await audit(context.supabaseAdmin, context.userId, `subscription.${data.action}`, "subscription", subscriptionId, data.accountId, changed);
    return { ok: true as const };
  });

export const getAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireOperationalAdmin])
  .handler(async ({ context }) => {
    const now = new Date(); const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    const [accounts, tickets, subscriptions, payments, reads] = await Promise.all([
      context.supabaseAdmin.from("accounts").select("id, name, status, created_at").order("created_at", { ascending: false }).limit(20),
      context.supabaseAdmin.from("support_tickets").select("id, subject, status, priority, last_message_at").in("status", ["open", "in_progress", "waiting_user"]).order("last_message_at", { ascending: false }).limit(30),
      context.supabaseAdmin.from("account_subscriptions").select("id, account_id, status, next_due_on, account:accounts(name)").lte("next_due_on", in30.toISOString().slice(0, 10)).neq("status", "cancelled").order("next_due_on").limit(30),
      context.supabaseAdmin.from("payments").select("id, account_id, status, due_on, account:accounts(name)").in("status", ["pending", "under_review", "overdue"]).order("due_on").limit(30),
      context.supabaseAdmin.from("admin_notification_reads").select("notification_key").eq("admin_user_id", context.userId),
    ]);
    if (accounts.error || tickets.error || subscriptions.error || payments.error || reads.error) throw new Error("Não foi possível carregar os alertas.");
    const read = new Set((reads.data ?? []).map((item) => item.notification_key));
    const items = [
      ...(accounts.data ?? []).filter((a) => new Date(a.created_at).getTime() >= now.getTime() - 7 * 86400000).map((a) => ({ key: `account:${a.id}`, kind: "account", title: "Novo cadastro", detail: a.name, date: a.created_at, to: "/admin/usuarios" })),
      ...(accounts.data ?? []).filter((a) => a.status === "suspended").map((a) => ({ key: `suspended:${a.id}`, kind: "account", title: "Conta suspensa", detail: a.name, date: a.created_at, to: "/admin/usuarios" })),
      ...(tickets.data ?? []).map((t) => ({ key: `ticket:${t.id}:${t.last_message_at}`, kind: "support", title: t.priority === "urgent" ? "Chamado urgente" : "Chamado pendente", detail: t.subject, date: t.last_message_at, to: "/admin/suporte" })),
      ...(subscriptions.data ?? []).map((s) => ({ key: `subscription:${s.id}:${s.next_due_on}`, kind: "subscription", title: "Licença próxima do vencimento", detail: s.account?.name ?? "Conta", date: `${s.next_due_on}T12:00:00Z`, to: "/admin/assinaturas" })),
      ...(payments.data ?? []).map((p) => ({ key: `payment:${p.id}:${p.status}`, kind: "payment", title: p.status === "overdue" ? "Pagamento vencido" : "Pagamento pendente", detail: p.account?.name ?? "Conta", date: `${p.due_on}T12:00:00Z`, to: "/admin/pagamentos" })),
    ].map((item) => ({ ...item, read: read.has(item.key) })).sort((a, b) => b.date.localeCompare(a.date));
    return items;
  });

const notificationInput = z.object({ key: z.string().min(3).max(220) });
export const markAdminNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireOperationalAdmin])
  .inputValidator((input) => notificationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin.from("admin_notification_reads").upsert({ admin_user_id: context.userId, notification_key: data.key, read_at: new Date().toISOString() }, { onConflict: "admin_user_id,notification_key" });
    if (error) throw new Error("Não foi possível dispensar o alerta.");
    return { ok: true as const };
  });
