import { describe, expect, it } from "vitest";

import { dueLabel, remainingLabel, type ProfessionalInfo } from "./professional-status";

const base: ProfessionalInfo = {
  status: "trial",
  access_type: "trial",
  financial: "not_configured",
  access_ends_at: null,
  next_due_on: null,
  next_amount_cents: null,
  last_activity_at: null,
  onboarded: true,
};
const now = new Date("2026-10-21T15:00:00Z");

describe("professional status labels", () => {
  it("counts remaining trial days", () => {
    expect(remainingLabel({ ...base, access_ends_at: "2026-10-26T15:00:00Z" }, now)).toBe("Degustação — faltam 5 dias");
  });
  it("says trial ends tomorrow", () => {
    expect(remainingLabel({ ...base, access_ends_at: "2026-10-22T15:00:00Z" }, now)).toBe("Degustação termina amanhã");
  });
  it("marks an ended trial as expired", () => {
    expect(remainingLabel({ ...base, status: "trial_expired", access_ends_at: "2026-10-20T15:00:00Z" }, now)).toBe("Degustação expirada");
  });
  it("shows admin free access end date", () => {
    expect(remainingLabel({ ...base, status: "free", access_type: "admin_free", access_ends_at: "2026-11-15T15:00:00Z" }, now)).toBe("Gratuito até 15/11/2026");
  });
  it("never invents an end date", () => {
    expect(remainingLabel(base, now)).toBe("Não registrado");
  });
  it("describes no billing when there is no due date", () => {
    expect(dueLabel(base, now)).toBe("Sem cobrança configurada");
  });
  it("describes an upcoming invoice", () => {
    expect(dueLabel({ ...base, next_due_on: "2026-10-24" }, now)).toBe("Fatura vence em 3 dias");
  });
  it("describes an overdue invoice", () => {
    expect(dueLabel({ ...base, next_due_on: "2026-10-19" }, now)).toBe("Fatura vencida há 2 dias");
  });
});
