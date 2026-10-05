import { describe, expect, it } from "vitest";
import { modalityMatches, normalizeRegistrationName, packageUnitCents, reaisToCents } from "./basic-registrations";
describe("cadastros básicos", () => {
  it("normaliza caixa e espaços", () => expect(normalizeRegistrationName("  Psicologia   Clínica ")).toBe("psicologia clínica"));
  it("converte reais para centavos", () => expect(reaisToCents("R$ 1.234,56")).toBe(123456));
  it("calcula o valor por sessão", () => expect(packageUnitCents(72000, 4)).toBe(18000));
  it("combina modalidades", () => { expect(modalityMatches("todas", "domiciliar")).toBe(true); expect(modalityMatches("online", "presencial")).toBe(false); });
});