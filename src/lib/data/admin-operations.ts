import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminNotifications,
  getAdminUserDeletionPreview,
  getAdminUserHistory,
  manageAdminSubscription,
  listAdminSubscriptionPlans,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  requireAdminPasswordReset,
  resendAdminAccessInstructions,
  sendAdminPasswordReset,
  updateAdminUserEmail,
  updateAdminUserProfile,
  inviteAdminUser,
  closeAdminUserAccount,
} from "@/lib/admin-operations.functions";

const refreshUser = (client: ReturnType<typeof useQueryClient>, userId: string) => {
  client.invalidateQueries({ queryKey: ["admin", "users", userId] });
  client.invalidateQueries({ queryKey: ["admin", "users"] });
  client.invalidateQueries({ queryKey: ["admin", "history", userId] });
};
export function useAdminUserOperations(userId: string) {
  const client = useQueryClient();
  const profile = useServerFn(updateAdminUserProfile);
  const email = useServerFn(updateAdminUserEmail);
  const reset = useServerFn(sendAdminPasswordReset);
  const resend = useServerFn(resendAdminAccessInstructions);
  const force = useServerFn(requireAdminPasswordReset);
  const options = { onSuccess: () => refreshUser(client, userId) };
  return {
    updateProfile: useMutation({
      mutationFn: (data: {
        userId: string;
        fullName: string;
        profession: string | null;
        professionalRegistry: string | null;
        city: string | null;
        state: string | null;
        phone: string | null;
        careMode: "presencial" | "online" | "ambos" | null;
        confirm: true;
      }) => profile({ data }),
      ...options,
    }),
    updateEmail: useMutation({
      mutationFn: (data: { userId: string; email: string; confirm: true }) => email({ data }),
      ...options,
    }),
    sendReset: useMutation({
      mutationFn: () => reset({ data: { userId, confirm: true } }),
      ...options,
    }),
    resendAccess: useMutation({
      mutationFn: () => resend({ data: { userId, confirm: true } }),
      ...options,
    }),
    forceReset: useMutation({
      mutationFn: () => force({ data: { userId, confirm: true } }),
      ...options,
    }),
  };
}
export function useInviteAdminUser() {
  const client = useQueryClient();
  const fn = useServerFn(inviteAdminUser);
  return useMutation({
    mutationFn: (data: {
      fullName: string;
      email: string;
      phone: string | null;
      role: "professional" | "support_admin" | "analyst" | "finance_admin" | "content_admin";
      confirm: true;
    }) => fn({ data }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
export function useAdminUserDeletionPreview(userId: string, enabled: boolean) {
  const fn = useServerFn(getAdminUserDeletionPreview);
  return useQuery({
    queryKey: ["admin", "users", userId, "deletion-preview"],
    queryFn: () => fn({ data: { userId } }),
    enabled,
  });
}
export function useCloseAdminUserAccount() {
  const client = useQueryClient();
  const fn = useServerFn(closeAdminUserAccount);
  return useMutation({
    mutationFn: (data: { userId: string; confirmation: string; confirm: true }) => fn({ data }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
export function useAdminUserHistory(userId: string) {
  const fn = useServerFn(getAdminUserHistory);
  return useQuery({
    queryKey: ["admin", "history", userId],
    queryFn: () => fn({ data: { userId } }),
  });
}
export function useManageAdminSubscription() {
  const client = useQueryClient();
  const fn = useServerFn(manageAdminSubscription);
  return useMutation({
    mutationFn: (data: {
      accountId: string;
      planId?: string;
      action:
        "create" | "change_plan" | "activate" | "restrict" | "extend" | "cancel" | "reactivate";
      days?: number;
      confirm: true;
    }) => fn({ data }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      client.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}
export function useAdminSubscriptionPlans() {
  const fn = useServerFn(listAdminSubscriptionPlans);
  return useQuery({ queryKey: ["admin", "subscription-plans"], queryFn: () => fn() });
}
export function useAdminNotifications() {
  const fn = useServerFn(getAdminNotifications);
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
}
export function useMarkAdminNotificationRead() {
  const client = useQueryClient();
  const fn = useServerFn(markAdminNotificationRead);
  return useMutation({
    mutationFn: (key: string) => fn({ data: { key } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });
}
export function useMarkAllAdminNotificationsRead() {
  const client = useQueryClient();
  const fn = useServerFn(markAllAdminNotificationsRead);
  return useMutation({
    mutationFn: (keys: string[]) => fn({ data: { keys } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });
}
