import { describe, expect, it } from "vitest";

import {
  formatCpf,
  formatPhone,
  formatPostalCode,
  genderSelection,
} from "@/lib/patient-field-formatters";

describe("patient field formatters", () => {
  it("formats and limits Brazilian identifiers", () => {
    expect(formatCpf("5299822472599")).toBe("529.982.247-25");
    expect(formatPostalCode("0131010099")).toBe("01310-100");
  });

  it("formats landline and mobile numbers", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
    expect(formatPhone("11999998888")).toBe("(11) 99999-8888");
  });

  it("keeps known gender options and identifies custom values", () => {
    expect(genderSelection("Feminino")).toBe("Feminino");
    expect(genderSelection("Não binário")).toBe("Outro");
  });
});