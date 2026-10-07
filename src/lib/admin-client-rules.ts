import { z } from "zod";

export const adminDirectoryResult = z.object({
  total: z.number(), page: z.number(), pageSize: z.number(),
  rows: z.array(z.object({
    id: z.string(), accountId: z.string().nullable(), name: z.string(), email: z.string(),
    profession: z.string().nullable(), phone: z.string().nullable(), specialties: z.array(z.string()),
    createdAt: z.string(), lastSignInAt: z.string().nullable(), onboardingCompleted: z.boolean(),
    accountStatus: z.string(), accountBlocked: z.boolean(), platformRole: z.string().nullable(),
    subscriptionStatus: z.string().nullable(), planName: z.string().nullable(), monthlyCents: z.number().nullable(),
    nextDueOn: z.string().nullable(), lastPaymentAt: z.string().nullable(), paymentStatus: z.string().nullable(),
    lastActivityAt: z.string().nullable(),
  })),
});

export function deletionEligibility(input: { self: boolean; admin: boolean; protectedAccount: boolean; counts: Record<string, number> }) {
  if (input.self) return { canDelete: false, reason: "Você não pode excluir sua própria conta." };
  if (input.admin || input.protectedAccount) return { canDelete: false, reason: "Esta identidade está protegida contra exclusão." };
  if (Object.values(input.counts).some((count) => count > 0)) return { canDelete: false, reason: "A conta possui dados que exigem preservação. Use a desativação." };
  return { canDelete: true, reason: null };
}
export const adminOverviewResult = z.object({
  generatedAt: z.string(), telemetrySince: z.string().nullable(),
  users: z.object({ total: z.number(), active: z.number(), suspended: z.number(), closed: z.number(), newToday: z.number(), newMonth: z.number(), new7Days: z.number(), new30Days: z.number(), onboardingPending: z.number() }),
  subscriptions: z.object({ active: z.number(), awaiting: z.number(), grace: z.number(), restricted: z.number(), cancelled: z.number() }),
  finance: z.object({ receivedMonthCents: z.number(), receivedYearCents: z.number(), expectedMonthCents: z.number(), pendingCount: z.number(), overdueCount: z.number(), due7DaysCents: z.number(), due30DaysCents: z.number(), mrrCents: z.number() }),
  usage: z.object({ activeAccounts7: z.number(), activeAccounts30: z.number(), events30: z.number() }),
  registrationsByMonth: z.array(z.object({ label: z.string(), total: z.number() })),
});
