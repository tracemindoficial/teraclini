import { describe, expect, it } from "vitest";

import { packageStatus, packageUsage } from "./package-metrics";

function packageItem(overrides: Record<string, unknown> = {}) {
  return {
    quantity: 5,
    end_date: null,
    renewal_alert_threshold: 2,
    lifecycle_status: "ativo",
    appointments: [],
    ...overrides,
  };
}

describe("packageUsage", () => {
  it("consumes only completed appointments", () => {
    const item = packageItem({
      appointments: [
        { status: "realizado" },
        { status: "agendado" },
        { status: "cancelado" },
        { status: "realizado" },
      ],
    });

    expect(packageUsage(item)).toEqual({ used: 2, remaining: 3 });
  });

  it("never exposes a negative remaining balance", () => {
    const item = packageItem({
      quantity: 1,
      appointments: [{ status: "realizado" }, { status: "realizado" }],
    });

    expect(packageUsage(item)).toEqual({ used: 2, remaining: 0 });
  });
});

describe("packageStatus", () => {
  it("prioritizes explicit cancellation and closure", () => {
    expect(packageStatus(packageItem({ lifecycle_status: "cancelado" }))).toBe("cancelado");
    expect(packageStatus(packageItem({ lifecycle_status: "encerrado" }))).toBe("encerrado");
  });

  it("marks packages without remaining sessions as exhausted", () => {
    expect(
      packageStatus(packageItem({ quantity: 1, appointments: [{ status: "realizado" }] })),
    ).toBe("esgotado");
  });

  it("marks elapsed packages as expired", () => {
    expect(packageStatus(packageItem({ end_date: "2026-01-01" }), new Date("2026-01-03"))).toBe(
      "expirado",
    );
  });

  it("uses the configured renewal threshold", () => {
    expect(
      packageStatus(
        packageItem({
          appointments: [{ status: "realizado" }, { status: "realizado" }, { status: "realizado" }],
        }),
      ),
    ).toBe("renovacao");
    expect(packageStatus(packageItem())).toBe("ativo");
  });
});
