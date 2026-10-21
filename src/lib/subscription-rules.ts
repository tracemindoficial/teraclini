export const TRIAL_DAYS = 7;
export const TRIAL_FIRST_NOTICE_DAY = 5;
export const PROMO_PRICE_CENTS = 4700;
export const PROMO_CYCLES = 3;
export const REGULAR_PRICE_CENTS = 5990;
export const DISPLAY_TIMEZONE = "America/Sao_Paulo";

const DAY_MS = 86_400_000;

export type CommercialState =
  | "pre_trial"
  | "trial"
  | "admin_trial"
  | "legacy"
  | "awaiting_contract"
  | "active"
  | "payment_pending"
  | "overdue"
  | "suspended"
  | "cancelled";

export const COMMERCIAL_STATE_LABELS: Record<CommercialState, string> = {
  pre_trial: "Cadastro em conclusão",
  trial: "Teste gratuito ativo",
  admin_trial: "Degustação administrativa ativa",
  legacy: "Acesso anterior preservado",
  awaiting_contract: "Aguardando contratação",
  active: "Assinatura ativa",
  payment_pending: "Pagamento pendente",
  overdue: "Assinatura vencida",
  suspended: "Acesso suspenso",
  cancelled: "Assinatura cancelada",
};

export const ACCESS_STATES: CommercialState[] = [
  "pre_trial",
  "trial",
  "admin_trial",
  "legacy",
  "active",
  "payment_pending",
];

export function hasCommercialAccess(state: CommercialState | null | undefined) {
  return !!state && ACCESS_STATES.includes(state);
}

/** Price for a 1-based paid cycle. Mirrors public.subscription_cycle_price. */
export function cyclePriceCents(
  cycle: number,
  promo = PROMO_PRICE_CENTS,
  promoCycles = PROMO_CYCLES,
  regular = REGULAR_PRICE_CENTS,
) {
  if (!Number.isInteger(cycle) || cycle < 1) throw new Error("Ciclo inválido");
  return cycle <= promoCycles ? promo : regular;
}

export function trialEndsAt(startedAt: Date, days = TRIAL_DAYS) {
  return new Date(startedAt.getTime() + days * DAY_MS);
}

export function firstNoticeAt(startedAt: Date) {
  return new Date(startedAt.getTime() + TRIAL_FIRST_NOTICE_DAY * DAY_MS);
}

export function daysRemaining(endsAt: Date | string | null | undefined, now = new Date()) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

export function formatBrasilia(value: string | Date | null | undefined, withTime = true) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(typeof value === "string" && value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value));
}
