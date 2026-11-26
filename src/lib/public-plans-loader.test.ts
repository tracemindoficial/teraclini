import { describe, expect, it } from "vitest";
import { loadPublicPlans } from "./public-plans-loader";

describe("optional public pricing", () => {
  it("keeps network failure separate from an empty catalogue", async () => {
    expect(await loadPublicPlans(async () => { throw new TypeError("Failed to fetch"); }))
      .toEqual({ plans: [], unavailable: true });
    expect(await loadPublicPlans(async () => [])).toEqual({ plans: [], unavailable: false });
  });
  it("can recover on the next lookup without retaining the failed state", async () => {
    await loadPublicPlans(async () => { throw new Error("Unavailable"); });
    const plans = [{
      id: "plan",
      code: "teraclini_mensal",
      name: "Plano Completo",
      price_cents: 6700,
      reference_price_cents: 12000,
      currency: "BRL",
      billing_interval_months: 1,
    }];
    expect(await loadPublicPlans(async () => plans)).toEqual({ plans, unavailable: false });
  });
});