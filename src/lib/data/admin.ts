import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getAdminOverview,
  getAdminSelf,
  getAdminUserDetail,
  getAdminSettings,
  listAdminAuditEvents,
  listAdminPayments,
  listAdminSubscriptions,
  listAdminUsers,
  setAdminAccountStatus,
  setAdminAccountBlock,
  setPlatformAdminRole,
  upsertAdminSetting,
} from "@/lib/platform-admin.functions";

export const adminKeys = {
  overview: ["admin", "overview"] as const,
  users: (search: string, status: string, sort: string, page: number) =>
    ["admin", "users", search, status, sort, page] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  payments: ["admin", "payments"] as const,
  settings: ["admin", "settings"] as const,
  self: ["admin", "self"] as const,
  audit: (action: string, page: number) => ["admin", "audit", action, page] as const,
  userDetail: (id: string) => ["admin", "users", id] as const,
};

export function useAdminOverview() {
  const fetcher = useServerFn(getAdminOverview);
  return useQuery({ queryKey: adminKeys.overview, queryFn: () => fetcher() });
}

export function useAdminUsers(
  search: string,
  status: "all" | "active" | "suspended" | "closed" | "blocked",
  payment: "all" | "confirmed" | "pending" | "overdue" | "none",
  role: string,
  sort: "newest" | "oldest" | "name" | "last_activity",
  page: number,
) {
  const fetcher = useServerFn(listAdminUsers);
  return useQuery({
    queryKey: [...adminKeys.users(search, status, sort, page), role, payment],
    queryFn: () => fetcher({ data: { search, status, payment, role, sort, page, pageSize: 20 } }),
  });
}

export function useAdminSubscriptions() {
  const fetcher = useServerFn(listAdminSubscriptions);
  return useQuery({ queryKey: adminKeys.subscriptions, queryFn: () => fetcher() });
}

export function useAdminPayments() {
  const fetcher = useServerFn(listAdminPayments);
  return useQuery({ queryKey: adminKeys.payments, queryFn: () => fetcher() });
}

export function useAdminSettings() {
  const fetcher = useServerFn(getAdminSettings);
  return useQuery({ queryKey: adminKeys.settings, queryFn: () => fetcher() });
}

export function useAdminSelf() {
  const fetcher = useServerFn(getAdminSelf);
  return useQuery({ queryKey: adminKeys.self, queryFn: () => fetcher() });
}

export function useAdminAuditEvents(action: string, page: number) {
  const fetcher = useServerFn(listAdminAuditEvents);
  return useQuery({
    queryKey: adminKeys.audit(action, page),
    queryFn: () => fetcher({ data: { action, page, pageSize: 20 } }),
  });
}

export function useAdminUserDetail(userId: string) {
  const fetcher = useServerFn(getAdminUserDetail);
  return useQuery({
    queryKey: adminKeys.userDetail(userId),
    queryFn: () => fetcher({ data: { userId } }),
  });
}

export function useSetAdminAccountStatus(userId: string) {
  const queryClient = useQueryClient();
  const mutation = useServerFn(setAdminAccountStatus);
  return useMutation({
    mutationFn: (data: {
      accountId: string;
      status: "active" | "suspended";
      reason: string;
      confirm: true;
    }) => mutation({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.overview });
      queryClient.invalidateQueries({ queryKey: ["admin", "history", userId] });
    },
  });
}

export function useSetAdminAccountBlock(userId: string) {
  const queryClient = useQueryClient();
  const mutation = useServerFn(setAdminAccountBlock);
  return useMutation({
    mutationFn: (data: { accountId: string; blocked: boolean; reason: string; confirm: true }) =>
      mutation({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.overview });
      queryClient.invalidateQueries({ queryKey: ["admin", "history", userId] });
    },
  });
}

export function useSetPlatformAdminRole(userId: string) {
  const queryClient = useQueryClient();
  const mutation = useServerFn(setPlatformAdminRole);
  return useMutation({
    mutationFn: (data: {
      userId: string;
      role: "super_admin" | "support_admin" | "analyst" | "finance_admin" | "content_admin" | null;
      confirm: true;
    }) => mutation({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "history", userId] });
    },
  });
}

export function useUpsertAdminSetting() {
  const queryClient = useQueryClient();
  const mutation = useServerFn(upsertAdminSetting);
  return useMutation({
    mutationFn: (data: {
      key: string;
      value: string | number | boolean | null;
      description: string | null;
      confirm: true;
    }) => mutation({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.settings }),
  });
}
