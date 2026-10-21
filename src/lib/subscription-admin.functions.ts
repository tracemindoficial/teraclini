import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/platform-admin.functions";
import type { CommercialSummary } from "@/lib/data/subscription";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message || "Operação não concluída.");
}

const accountInput = z.object({ accountId: z.string().uuid() });

export type SubscriptionOverview = {
  total: number;
  trial: number;
  trial_ending: number;
  expired: number;
  admin_trial: number;
  active: number;
  legacy: number;
  pending: number;
  overdue_or_suspended: number;
  revenue_month_cents: number;
  last_job: { started_at: string; finished_at: string | null; failures: number } | null;
};

export type SubscriptionDirectoryRow = {
  account_id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  summary: CommercialSummary;
};

export type SubscriptionDetail = {
  account_id: string;
  created_at: string;
  account_status: string;
  full_name: string | null;
  email: string | null;
  summary: CommercialSummary;
  events: {
    action: string;
    previous_values: Record<string, string | number | boolean | null> | null;
    new_values: Record<string, string | number | boolean | null> | null;
    reason: string | null;
    created_at: string;
  }[];
  notifications: {
    kind: string;
    title: string;
    in_app_status: string;
    external_status: string;
    attempts: number;
    last_error: string | null;
    read_at: string | null;
    suppressed_at: string | null;
    created_at: string;
  }[];
  payments: {
    cycle_number: number | null;
    amount_cents: number;
    due_on: string;
    paid_at: string | null;
    status: string;
    method: string;
  }[];
};

export const getAdminSubscriptionOverview = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabaseAdmin.rpc("admin_subscription_overview", {
      _actor_user_id: context.userId,
    });
    fail(error);
    return data as unknown as SubscriptionOverview;
  });

export const listAdminSubscriptionDirectory = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(
    z.object({
      search: z.string().max(120),
      state: z.string().max(40),
      page: z.number().int().min(1).max(1000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabaseAdmin.rpc(
      "admin_subscription_directory",
      {
        _actor_user_id: context.userId,
        _search: data.search,
        _state: data.state,
        _page: data.page,
        _page_size: 20,
      },
    );
    fail(error);
    return result as unknown as { total: number; rows: SubscriptionDirectoryRow[] };
  });

export const getAdminSubscriptionDetail = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(accountInput)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabaseAdmin.rpc("admin_subscription_detail", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
    });
    fail(error);
    return result as unknown as SubscriptionDetail;
  });

export const adminGrantTrial = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(
    accountInput.extend({
      days: z.number().int().min(1).max(365),
      startsAt: z.string().datetime(),
      reason: z.enum(["degustacao", "demonstracao", "parceria", "cortesia"]),
      notes: z.string().max(1000),
      convertible: z.boolean(),
      billingStartsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      confirm: z.literal(true),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabaseAdmin.rpc("admin_grant_trial", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _days: data.days,
      _starts_at: data.startsAt,
      _reason: data.reason,
      _notes: data.notes,
      _convertible: data.convertible,
      _billing_starts_on: data.billingStartsOn as string,
    });
    fail(error);
    return { id };
  });

export const adminExtendAccess = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(
    accountInput.extend({
      days: z.number().int().min(1).max(365),
      reason: z.string().trim().min(3).max(500),
      confirm: z.literal(true),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin.rpc("admin_extend_access", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _days: data.days,
      _reason: data.reason,
    });
    fail(error);
    return { ok: true };
  });

export const adminRevokeAccessGrant = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(
    accountInput.extend({ reason: z.string().trim().min(3).max(500), confirm: z.literal(true) }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin.rpc("admin_revoke_access_grant", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _reason: data.reason,
    });
    fail(error);
    return { ok: true };
  });

export const adminConfigureBilling = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(
    accountInput.extend({
      firstDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      promoPriceCents: z.number().int().min(100).max(10_000_000),
      promoCycles: z.number().int().min(0).max(24),
      regularPriceCents: z.number().int().min(100).max(10_000_000),
      confirm: z.literal(true),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin.rpc("admin_configure_billing", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _first_due_on: data.firstDueOn,
      _promo_price_cents: data.promoPriceCents,
      _promo_cycles: data.promoCycles,
      _regular_price_cents: data.regularPriceCents,
    });
    fail(error);
    return { ok: true };
  });

export const adminRecordSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(
    accountInput.extend({
      paidAt: z.string().datetime(),
      method: z.enum(["pix", "other"]),
      transactionId: z.string().max(120),
      confirm: z.literal(true),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin.rpc("admin_record_subscription_payment", {
      _actor_user_id: context.userId,
      _account_id: data.accountId,
      _paid_at: data.paidAt,
      _method: data.method,
      _transaction_id: data.transactionId,
    });
    fail(error);
    return { ok: true };
  });
