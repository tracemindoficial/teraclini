import { describe, expect, it } from "vitest";
import { deletionEligibility } from "./admin-client-rules";

const empty = { self: false, admin: false, protectedAccount: false, counts: {} };
describe("exclusão individual segura", () => {
  it("permite uma conta vazia", () => expect(deletionEligibility(empty).canDelete).toBe(true));
  it("impede autoexclusão", () => expect(deletionEligibility({ ...empty, self: true }).canDelete).toBe(false));
  it("preserva identidades administrativas", () => expect(deletionEligibility({ ...empty, admin: true }).canDelete).toBe(false));
  it("preserva a identidade prioritária", () => expect(deletionEligibility({ ...empty, protectedAccount: true }).canDelete).toBe(false));
  for (const key of ["patients", "evolutions", "documents", "payments", "patient_registration_requests", "files", "other_members", "custom_services"]) {
    it(`preserva vínculo ${key}`, () => expect(deletionEligibility({ ...empty, counts: { [key]: 1 } }).canDelete).toBe(false));
  }
  it("aceita contagens realmente vazias", () => expect(deletionEligibility({ ...empty, counts: { patients: 0, files: 0 } }).canDelete).toBe(true));
});