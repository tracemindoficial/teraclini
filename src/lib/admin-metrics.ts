export type PaymentMetric = {
  amount_cents: number;
  status:
    "pending" | "under_review" | "confirmed" | "rejected" | "overdue" | "refunded" | "cancelled";
  due_on: string;
  paid_at: string | null;
  confirmed_at: string | null;
};

export function confirmedRevenue(payments: PaymentMetric[], from: Date, to: Date) {
  return payments.reduce((total, payment) => {
    if (payment.status !== "confirmed" || !payment.confirmed_at) return total;
    const confirmedAt = new Date(payment.confirmed_at);
    return confirmedAt >= from && confirmedAt < to ? total + payment.amount_cents : total;
  }, 0);
}

export function expectedRevenue(payments: PaymentMetric[], from: Date, to: Date) {
  return payments.reduce((total, payment) => {
    if (["rejected", "refunded", "cancelled"].includes(payment.status)) return total;
    const dueOn = new Date(`${payment.due_on}T00:00:00`);
    return dueOn >= from && dueOn < to ? total + payment.amount_cents : total;
  }, 0);
}

export function brlFromCents(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}
