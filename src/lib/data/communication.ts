import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CommunicationConversation, CommunicationDraft, CommunicationFilter,
  CommunicationMessage, CommunicationRecipient,
} from "@/lib/communication";
import { queryKeys } from "@/lib/query-keys";

const key = queryKeys.communication;
export const communicationSendKey = [...key, "send"] as const;
const polling = { refetchInterval: 20_000, refetchOnWindowFocus: true } as const;
export const communicationPageSize = 25;

export function useCommunicationUnread(admin: boolean, enabled = true) {
  return useQuery({
    queryKey: [...key, "unread", admin], enabled, ...polling,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("communication_unread", { _admin: admin });
      if (error) throw error;
      return data ?? 0;
    },
  });
}

export function useCommunicationList(admin: boolean, filter: CommunicationFilter, search: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: [...key, "list", admin, filter, search, page], enabled, ...polling,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("communication_list", {
        _admin: admin, _filter: filter, _search: search, _offset: page * communicationPageSize,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CommunicationConversation[];
    },
  });
}

export function useCommunicationRecipients(search: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, "recipients", search], enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("communication_recipients", { _search: search });
      if (error) throw error;
      return (data ?? []) as unknown as CommunicationRecipient[];
    },
  });
}

export function useCommunicationThread(id: string, admin: boolean) {
  const client = useQueryClient();
  return useQuery({
    queryKey: [...key, "thread", admin, id], ...polling,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("communication_open", { _id: id, _admin: admin });
      if (error) throw error;
      const thread = data as unknown as { archived: boolean; messages: CommunicationMessage[] };
      const previous = client.getQueryData<typeof thread>([...key, "thread", admin, id]);
      const changed = !previous || previous.archived !== thread.archived ||
        previous.messages.length !== thread.messages.length ||
        previous.messages.some((message, index) => message.id !== thread.messages[index].id || message.read_at !== thread.messages[index].read_at);
      if (changed) {
        void client.invalidateQueries({ queryKey: [...key, "list", admin] });
        void client.invalidateQueries({ queryKey: [...key, "unread", admin] });
      }
      return thread;
    },
  });
}

export function useCommunicationActions(admin: boolean) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const send = useMutation({
    mutationKey: communicationSendKey,
    mutationFn: async ({ draft, request }: { draft: CommunicationDraft; request: string }) => {
      const { data, error } = await supabase.rpc("communication_send", {
        _request: request, _audience: draft.audience, _recipient: draft.recipient,
        _subject: draft.subject, _category: draft.category, _priority: draft.priority, _body: draft.body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
  });
  const reply = useMutation({
    mutationFn: async ({ id, body, request }: { id: string; body: string; request: string }) => {
      const { error } = await supabase.rpc("communication_reply", {
        _id: id, _admin: admin, _body: body, _request: request,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.rpc("communication_archive", { _id: id, _archived: archived });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { send, reply, archive };
}
