import { describe, expect, it } from "vitest";

import { confirmedRevenue, expectedRevenue, type PaymentMetric } from "@/lib/admin-metrics";

const base: PaymentMetric = {
  amount_cents: 6700,
  status: "pending",
  due_on: "2026-10-10",
  paid_at: null,
  confirmed_at: null,
};

describe("admin financial metrics", () => {
  const from = new Date("2026-10-01T00:00:00Z");
  const to = new Date("2026-11-01T00:00:00Z");

  it("counts only confirmed payments as received revenue", () => {
    const rows: PaymentMetric[] = [
      { ...base, status: "confirmed", paid_at: "2026-10-08T12:00:00Z", confirmed_at: "2026-10-08T12:01:00Z" },
      { ...base, status: "pending" },
      { ...base, status: "refunded", paid_at: "2026-10-08T12:00:00Z", confirmed_at: "2026-10-08T12:01:00Z" },
    ];
    expect(confirmedRevenue(rows, from, to)).toBe(6700);
  });

  it("does not count confirmation outside the selected period", () => {
    const rows: PaymentMetric[] = [
      { ...base, status: "confirmed", paid_at: "2026-09-30T12:00:00Z", confirmed_at: "2026-09-30T12:01:00Z" },
    ];
    expect(confirmedRevenue(rows, from, to)).toBe(0);
  });

  it("keeps forecast separate and excludes invalidated payments", () => {
    const rows: PaymentMetric[] = [
      base,
      { ...base, status: "under_review" },
      { ...base, status: "cancelled" },
      { ...base, status: "refunded" },
      { ...base, status: "rejected" },
    ];
    expect(expectedRevenue(rows, from, to)).toBe(13400);
  });
});