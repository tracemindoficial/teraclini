/**
 * Tradução de erros de autenticação para mensagens claras ao usuário,
 * sem expor detalhes internos da arquitetura.
 */
export type AuthFailure = { message: string; code: string };

export function describeAuthError(error: unknown): AuthFailure {
  const raw = error as { code?: string; status?: number; message?: string } | undefined;
  const code = raw?.code ?? (raw?.status ? `http_${raw.status}` : "unknown");
  const message = (raw?.message ?? "").toLowerCase();

  const map: Record<string, string> = {
    user_already_exists: "Este e-mail já possui uma conta. Faça login ou recupere sua senha.",
    email_exists: "Este e-mail já possui uma conta. Faça login ou recupere sua senha.",
    weak_password: "Escolha uma senha mais forte: use ao menos 8 caracteres, com letras e números.",
    over_email_send_rate_limit:
      "Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.",
    over_request_rate_limit:
      "Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.",
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed: "Confirme seu e-mail antes de entrar.",
    signup_disabled: "Novos cadastros estão temporariamente indisponíveis.",
    validation_failed: "Verifique os dados informados e tente novamente.",
    timeout: "O servidor demorou para responder. Verifique sua conexão e tente novamente.",
  };

  if (map[code]) return { message: map[code], code };
  if (message.includes("already registered") || message.includes("already been registered")) {
    return { message: map["user_already_exists"]!, code: "user_already_exists" };
  }
  if (message.includes("invalid login")) {
    return { message: map["invalid_credentials"]!, code: "invalid_credentials" };
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return {
      message: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
      code: "network_error",
    };
  }
  return {
    message: "Não foi possível concluir agora. Tente novamente em instantes.",
    code,
  };
}

/** Evita requisições penduradas indefinidamente (loading infinito). */
export async function withTimeout<T>(promise: PromiseLike<T>, ms = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise as Promise<T>,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Log técnico sem dados sensíveis (sem senha, sem token, sem e-mail completo). */
export function logAuthEvent(
  step: string,
  outcome: "start" | "success" | "failure",
  details: { code?: string; durationMs?: number } = {},
) {
  const payload = { step, outcome, ...details };
  if (outcome === "failure") console.error("[auth]", payload);
  else console.info("[auth]", payload);
}
