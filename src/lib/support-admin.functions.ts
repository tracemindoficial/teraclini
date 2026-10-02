import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireSupportAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_admins")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data || !["super_admin", "support_admin"].includes(data.role))
      throw new Response("Forbidden", { status: 403 });
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("status")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!account || account.status !== "active") throw new Response("Forbidden", { status: 403 });
    return next({ context: { ...context, supabaseAdmin } });
  });

export const listAdminSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupportAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabaseAdmin
      .from("support_tickets")
      .select("id, account_id, user_id, subject, status, last_message_at, created_at")
      .order("last_message_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os chamados.");
    const userIds = [...new Set((data ?? []).map((item) => item.user_id))];
    const { data: profiles } = userIds.length
      ? await context.supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
    const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    return (data ?? []).map((item) => ({
      ...item,
      professionalName: names.get(item.user_id) || "Profissional",
    }));
  });

const ticketInput = z.object({ ticketId: z.string().uuid() });
export const getAdminSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupportAdmin])
  .inputValidator((input) => ticketInput.parse(input))
  .handler(async ({ data, context }) => {
    const [ticket, messages] = await Promise.all([
      context.supabaseAdmin
        .from("support_tickets")
        .select("id, account_id, user_id, subject, status, created_at, resolved_at")
        .eq("id", data.ticketId)
        .single(),
      context.supabaseAdmin
        .from("support_messages")
        .select("id, author_type, message, created_at")
        .eq("ticket_id", data.ticketId)
        .order("created_at"),
    ]);
    if (ticket.error || messages.error) throw new Error("Não foi possível carregar o chamado.");
    return { ticket: ticket.data, messages: messages.data ?? [] };
  });

const replyInput = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});
export const replyAdminSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupportAdmin])
  .inputValidator((input) => replyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ticket, error: ticketError } = await context.supabaseAdmin
      .from("support_tickets")
      .select("id, account_id, status")
      .eq("id", data.ticketId)
      .single();
    if (ticketError || !ticket || ticket.status === "resolved")
      throw new Error("Chamado indisponível para resposta.");
    const { error } = await context.supabaseAdmin.from("support_messages").insert({
      ticket_id: ticket.id,
      account_id: ticket.account_id,
      author_user_id: context.userId,
      author_type: "admin",
      message: data.message,
    });
    if (error) throw new Error("Não foi possível responder ao chamado.");
    await context.supabaseAdmin
      .from("support_tickets")
      .update({ status: "waiting_user" })
      .eq("id", ticket.id);
    await context.supabaseAdmin.from("platform_audit_events").insert({
      actor_user_id: context.userId,
      action: "support.reply",
      entity_type: "support_ticket",
      entity_id: ticket.id,
      account_id: ticket.account_id,
      changed_fields: ["status"],
      result: "success",
    });
    return { ok: true as const };
  });

const statusInput = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "waiting_user", "resolved"]),
  confirm: z.literal(true),
});
export const setAdminSupportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupportAdmin])
  .inputValidator((input) => statusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ticket, error: readError } = await context.supabaseAdmin
      .from("support_tickets")
      .select("id, account_id, status")
      .eq("id", data.ticketId)
      .single();
    if (readError || !ticket) throw new Error("Chamado não encontrado.");
    const { error } = await context.supabaseAdmin
      .from("support_tickets")
      .update({
        status: data.status,
        resolved_at: data.status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", ticket.id);
    if (error) throw new Error("Não foi possível atualizar o chamado.");
    await context.supabaseAdmin.from("platform_audit_events").insert({
      actor_user_id: context.userId,
      action: "support.status",
      entity_type: "support_ticket",
      entity_id: ticket.id,
      account_id: ticket.account_id,
      changed_fields: ["status", "resolved_at"],
      result: "success",
    });
    return { ok: true as const };
  });
