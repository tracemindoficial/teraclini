import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminNotifications, getAdminUserHistory, manageAdminSubscription,
  markAdminNotificationRead, requireAdminPasswordReset, resendAdminAccessInstructions,
  revokeAdminUserSessions, sendAdminPasswordReset, updateAdminUserEmail, updateAdminUserProfile,
} from "@/lib/admin-operations.functions";

const refreshUser = (client: ReturnType<typeof useQueryClient>, userId: string) => {
  client.invalidateQueries({ queryKey: ["admin", "users", userId] });
  client.invalidateQueries({ queryKey: ["admin", "users"] });
  client.invalidateQueries({ queryKey: ["admin", "history", userId] });
};
export function useAdminUserOperations(userId: string) {
  const client = useQueryClient();
  const profile = useServerFn(updateAdminUserProfile); const email = useServerFn(updateAdminUserEmail);
  const reset = useServerFn(sendAdminPasswordReset); const resend = useServerFn(resendAdminAccessInstructions);
  const force = useServerFn(requireAdminPasswordReset); const revoke = useServerFn(revokeAdminUserSessions);
  const options = { onSuccess: () => refreshUser(client, userId) };
  return {
    updateProfile: useMutation({ mutationFn: (data: Parameters<typeof updateAdminUserProfile>[0]["data"]) => profile({ data }), ...options }),
    updateEmail: useMutation({ mutationFn: (data: Parameters<typeof updateAdminUserEmail>[0]["data"]) => email({ data }), ...options }),
    sendReset: useMutation({ mutationFn: () => reset({ data: { userId, confirm: true } }), ...options }),
    resendAccess: useMutation({ mutationFn: () => resend({ data: { userId, confirm: true } }), ...options }),
    forceReset: useMutation({ mutationFn: () => force({ data: { userId, confirm: true } }), ...options }),
    revokeSessions: useMutation({ mutationFn: () => revoke({ data: { userId, confirm: true } }), ...options }),
  };
}
export function useAdminUserHistory(userId: string) {
  const fn = useServerFn(getAdminUserHistory);
  return useQuery({ queryKey: ["admin", "history", userId], queryFn: () => fn({ data: { userId } }) });
}
export function useManageAdminSubscription() {
  const client = useQueryClient(); const fn = useServerFn(manageAdminSubscription);
  return useMutation({ mutationFn: (data: Parameters<typeof manageAdminSubscription>[0]["data"]) => fn({ data }), onSuccess: () => { client.invalidateQueries({ queryKey: ["admin", "subscriptions"] }); client.invalidateQueries({ queryKey: ["admin", "overview"] }); } });
}
export function useAdminNotifications() {
  const fn = useServerFn(getAdminNotifications);
  return useQuery({ queryKey: ["admin", "notifications"], queryFn: () => fn(), refetchInterval: 60_000 });
}
export function useMarkAdminNotificationRead() {
  const client = useQueryClient(); const fn = useServerFn(markAdminNotificationRead);
  return useMutation({ mutationFn: (key: string) => fn({ data: { key } }), onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "notifications"] }) });
}
