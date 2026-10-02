import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";

export type SupportStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export function useSupportTickets() {
  return useQuery({
    queryKey: queryKeys.supportTickets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, status, last_message_at, created_at, resolved_at")
        .order("last_message_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useSupportTicket(ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.supportTicket(ticketId ?? "none"),
    enabled: Boolean(ticketId),
    queryFn: async () => {
      if (!ticketId) throw new Error("Chamado não informado.");
      const [ticket, messages] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("id, subject, status, last_message_at, created_at, resolved_at")
          .eq("id", ticketId)
          .single(),
        supabase
          .from("support_messages")
          .select("id, author_type, message, created_at")
          .eq("ticket_id", ticketId)
          .order("created_at"),
      ]);
      if (ticket.error || messages.error) throw new Error("Não foi possível carregar o chamado.");
      return { ticket: ticket.data, messages: messages.data ?? [] };
    },
  });
}

export function useCreateSupportTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject: string; message: string }) => {
      const { data, error } = await supabase.rpc("create_support_ticket", {
        _subject: input.subject,
        _message: input.message,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.supportTickets }),
  });
}

export function useReplySupportTicket(ticketId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.rpc("reply_support_ticket", {
        _ticket_id: ticketId,
        _message: message,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.supportTickets });
      client.invalidateQueries({ queryKey: queryKeys.supportTicket(ticketId) });
    },
  });
}
