import { describe, expect, it } from "vitest";

import {
  cyclePriceCents,
  daysRemaining,
  firstNoticeAt,
  formatBrasilia,
  hasCommercialAccess,
  trialEndsAt,
} from "./subscription-rules";

describe("política comercial", () => {
  it("preserva a regra por ciclo de contratos antigos quando seus valores são informados", () => {
    expect([1, 2, 3, 4, 5].map((cycle) => cyclePriceCents(cycle, 4700, 3, 5990))).toEqual([
      4700, 4700, 4700, 5990, 5990,
    ]);
  });

  it("mantém o valor contratado em todos os ciclos quando não há promoção", () => {
    expect([1, 2, 3, 4, 12, 25].map((cycle) => cyclePriceCents(cycle, 6700, 0, 6700))).toEqual([
      6700, 6700, 6700, 6700, 6700, 6700,
    ]);
  });

  it("teste padrão termina exatamente 7 dias após a ativação", () => {
    const start = new Date("2026-10-21T16:48:00Z");
    expect(trialEndsAt(start).toISOString()).toBe("2026-10-28T16:48:00.000Z");
  });

  it("primeiro aviso ocorre no quinto dia, faltando 2 dias", () => {
    const start = new Date("2026-10-21T16:48:00Z");
    const notice = firstNoticeAt(start);
    expect(notice.toISOString()).toBe("2026-10-26T16:48:00.000Z");
    expect(daysRemaining(trialEndsAt(start), notice)).toBe(2);
  });

  it("não encerra antes do término e zera depois", () => {
    const end = new Date("2026-10-28T16:48:00Z");
    expect(daysRemaining(end, new Date("2026-10-28T16:47:00Z"))).toBe(1);
    expect(daysRemaining(end, new Date("2026-10-28T16:48:00Z"))).toBe(0);
  });

  it("teste expirado bloqueia; degustação e assinatura liberam", () => {
    expect(hasCommercialAccess("awaiting_contract")).toBe(false);
    expect(hasCommercialAccess("overdue")).toBe(false);
    expect(hasCommercialAccess("admin_trial")).toBe(true);
    expect(hasCommercialAccess("active")).toBe(true);
  });

  it("exibe datas em horário de Brasília", () => {
    expect(formatBrasilia("2026-10-28T02:00:00Z")).toBe("27/10/2026, 23:00");
  });
});
