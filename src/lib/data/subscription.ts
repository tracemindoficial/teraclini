import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { getPublicPlans } from "@/lib/public-commercial.functions";
import { COMPLETE_PLAN_CODE, type CommercialState } from "@/lib/subscription-rules";
import {
  adminConfigureBilling,
  adminExtendAccess,
  adminGrantTrial,
  adminRecordSubscriptionPayment,
  adminRevokeAccessGrant,
  getAdminSubscriptionDetail,
  getAdminSubscriptionOverview,
  listAdminSubscriptionDirectory,
} from "@/lib/subscription-admin.functions";

export type CommercialSummary = {
  state: CommercialState;
  legacy: boolean;
  trial: {
    kind: "standard_trial" | "admin_trial";
    starts_at: string;
    ends_at: string;
    reason: string | null;
    notes: string | null;
    convertible: boolean;
    billing_starts_on: string | null;
    revoked_at: string | null;
  } | null;
  subscription: {
    status: string;
    next_due_on: string;
    next_amount_cents: number;
    promo_price_cents: number;
    promo_cycles: number;
    regular_price_cents: number;
    paid_cycles: number;
  } | null;
};

export type MyCommercialStatus = CommercialSummary & {
  contract_requested_at: string | null;
  notifications: {
    id: string;
    kind: string;
    title: string;
    body: string;
    action_path: string | null;
    read_at: string | null;
    created_at: string;
  }[];
};

export const subscriptionKeys = {
  offer: ["subscription", "offer"] as const,
  mine: ["subscription", "mine"] as const,
  adminOverview: ["admin", "subscriptions-v2", "overview"] as const,
  adminDirectory: (search: string, state: string, page: number) =>
    ["admin", "subscriptions-v2", "directory", search, state, page] as const,
  adminDetail: (accountId: string) => ["admin", "subscriptions-v2", "detail", accountId] as const,
};

export function useCompletePlan(enabled: boolean) {
  const fetchPlans = useServerFn(getPublicPlans);
  return useQuery({
    queryKey: subscriptionKeys.offer,
    enabled,
    queryFn: async () => (await fetchPlans()).find((plan) => plan.code === COMPLETE_PLAN_CODE) ?? null,
  });
}

export function useMyCommercialStatus() {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_commercial_status");
      if (error) throw new Error("Não foi possível carregar sua assinatura.");
      return data as unknown as MyCommercialStatus;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("mark_my_notification_read", { _id: id });
      if (error) throw new Error("Não foi possível atualizar o aviso.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subscriptionKeys.mine }),
  });
}

export function useRequestContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_subscription_contract");
      if (error) throw new Error("Não foi possível registrar sua solicitação.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subscriptionKeys.mine }),
  });
}

export function useAdminSubscriptionOverview() {
  const fn = useServerFn(getAdminSubscriptionOverview);
  return useQuery({ queryKey: subscriptionKeys.adminOverview, queryFn: () => fn() });
}

export function useAdminSubscriptionDirectory(search: string, state: string, page: number) {
  const fn = useServerFn(listAdminSubscriptionDirectory);
  return useQuery({
    queryKey: subscriptionKeys.adminDirectory(search, state, page),
    queryFn: () => fn({ data: { search, state, page } }),
  });
}

export function useAdminSubscriptionDetail(accountId: string | null) {
  const fn = useServerFn(getAdminSubscriptionDetail);
  return useQuery({
    queryKey: subscriptionKeys.adminDetail(accountId ?? ""),
    enabled: !!accountId,
    queryFn: () => fn({ data: { accountId: accountId! } }),
  });
}

function useAdminAction<T>(fn: (args: { data: T }) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "subscriptions-v2"] }),
  });
}

export function useAdminSubscriptionActions() {
  return {
    grant: useAdminAction(useServerFn(adminGrantTrial)),
    extend: useAdminAction(useServerFn(adminExtendAccess)),
    revoke: useAdminAction(useServerFn(adminRevokeAccessGrant)),
    configure: useAdminAction(useServerFn(adminConfigureBilling)),
    pay: useAdminAction(useServerFn(adminRecordSubscriptionPayment)),
  };
}
