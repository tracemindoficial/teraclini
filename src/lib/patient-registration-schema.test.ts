import { describe, expect, it } from "vitest";

import {
  EMPTY_REGISTRATION,
  isValidCpf,
  registrationPayloadSchema,
} from "@/lib/patient-registration-schema";

const validPayload = {
  ...EMPTY_REGISTRATION,
  full_name: "Paciente de Teste",
  email: "paciente@example.com",
  birth_date: "1990-05-12",
  cpf: "529.982.247-25",
  postal_code: "01310-100",
  city: "São Paulo",
  state: "SP",
  therapy_reason: "Acompanhamento terapêutico",
  privacy_consent: true,
};

describe("patient preregistration validation", () => {
  it("accepts a complete adult preregistration", () => {
    expect(registrationPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects an invalid CPF", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(
      registrationPayloadSchema.safeParse({ ...validPayload, cpf: "111.111.111-11" }).success,
    ).toBe(false);
  });

  it("requires a guardian for a minor", () => {
    const result = registrationPayloadSchema.safeParse({
      ...validPayload,
      age_group: "crianca",
      guardian_name: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "guardian_name"),
      ).toBe(true);
    }
  });

  it("keeps optional fields optional", () => {
    const result = registrationPayloadSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("");
      expect(result.data.guardian_name).toBe("");
    }
  });
});