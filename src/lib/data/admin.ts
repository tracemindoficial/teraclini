import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getAdminOverview, getAdminSettings, listAdminPayments, listAdminSubscriptions, listAdminUsers } from "@/lib/platform-admin.functions";

export const adminKeys = {
  overview: ["admin", "overview"] as const,
  users: (search: string, status: string, page: number) => ["admin", "users", search, status, page] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  payments: ["admin", "payments"] as const,
  settings: ["admin", "settings"] as const,
};

export function useAdminOverview() {
  const fetcher = useServerFn(getAdminOverview);
  return useQuery({ queryKey: adminKeys.overview, queryFn: () => fetcher() });
}

export function useAdminUsers(search: string, status: "all" | "active" | "suspended" | "closed", page: number) {
  const fetcher = useServerFn(listAdminUsers);
  return useQuery({ queryKey: adminKeys.users(search, status, page), queryFn: () => fetcher({ data: { search, status, page, pageSize: 20 } }) });
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
