import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminSupportTicket,
  listAdminSupportTickets,
  replyAdminSupportTicket,
  setAdminSupportStatus,
} from "@/lib/support-admin.functions";
import type { SupportStatus } from "@/lib/data/support";

const keys = {
  list: ["admin", "support"] as const,
  detail: (id: string) => ["admin", "support", id] as const,
};
export function useAdminSupportTickets() {
  const fn = useServerFn(listAdminSupportTickets);
  return useQuery({ queryKey: keys.list, queryFn: () => fn() });
}
export function useAdminSupportTicket(id: string | null) {
  const fn = useServerFn(getAdminSupportTicket);
  return useQuery({
    queryKey: keys.detail(id ?? "none"),
    enabled: Boolean(id),
    queryFn: () => fn({ data: { ticketId: id ?? "" } }),
  });
}
export function useAdminSupportActions(id: string) {
  const client = useQueryClient();
  const reply = useServerFn(replyAdminSupportTicket);
  const status = useServerFn(setAdminSupportStatus);
  const refresh = () => {
    client.invalidateQueries({ queryKey: keys.list });
    client.invalidateQueries({ queryKey: keys.detail(id) });
  };
  return {
    reply: useMutation({
      mutationFn: (message: string) => reply({ data: { ticketId: id, message } }),
      onSuccess: refresh,
    }),
    status: useMutation({
      mutationFn: (value: SupportStatus) =>
        status({ data: { ticketId: id, status: value, confirm: true } }),
      onSuccess: refresh,
    }),
  };
}
