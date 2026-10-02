import { describe, expect, it, vi } from "vitest";

import { describeAuthError, withTimeout } from "./auth-errors";

describe("describeAuthError", () => {
  it("translates known authentication failures without exposing raw details", () => {
    expect(describeAuthError({ code: "invalid_credentials", message: "sensitive detail" })).toEqual(
      {
        code: "invalid_credentials",
        message: "E-mail ou senha incorretos.",
      },
    );
  });

  it("uses a safe generic message for unknown failures", () => {
    expect(describeAuthError(new Error("internal infrastructure detail"))).toEqual({
      code: "unknown",
      message: "Não foi possível concluir agora. Tente novamente em instantes.",
    });
  });

  it("recognizes network failures", () => {
    expect(describeAuthError(new Error("Failed to fetch"))).toEqual({
      code: "network_error",
      message: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    });
  });
});

describe("withTimeout", () => {
  it("returns successful results", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 10)).resolves.toBe("ok");
  });

  it("rejects stalled requests with the timeout code", async () => {
    vi.useFakeTimers();
    const expectation = expect(withTimeout(new Promise(() => undefined), 20)).rejects.toMatchObject(
      {
        code: "timeout",
      },
    );
    await vi.advanceTimersByTimeAsync(20);
    await expectation;
    vi.useRealTimers();
  });
});
