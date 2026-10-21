/**
 * Presentation rules for the unified professional lifecycle. The primary status
 * itself is computed once in the database (admin_professional_row); this module
 * only turns those values into labels so every screen shows the same wording.
 */
export type ProfessionalStatus =
  | "suspended"
  | "incomplete"
  | "overdue"
  | "payment_pending"
  | "active"
  | "free"
  | "trial_ending"
  | "trial"
  | "trial_expired"
  | "cancelled"
  | "recent";

export type AccessType = "paid" | "legacy" | "admin_free" | "trial" | "none";
export type FinancialState = "overdue" | "pending" | "up_to_date" | "not_configured";

export type ProfessionalInfo = {
  status: ProfessionalStatus;
  access_type: AccessType;
  financial: FinancialState;
  access_ends_at: string | null;
  next_due_on: string | null;
  next_amount_cents: number | null;
  last_activity_at: string | null;
  onboarded: boolean;
};

export const STATUS_LABELS: Record<ProfessionalStatus, string> = {
  suspended: "Acesso suspenso",
  incomplete: "Cadastro incompleto",
  overdue: "Fatura vencida",
  payment_pending: "Pagamento pendente",
  active: "Assinatura ativa",
  free: "Acesso gratuito concedido",
  trial_ending: "Degustação terminando",
  trial: "Degustação gratuita ativa",
  trial_expired: "Degustação expirada",
  cancelled: "Assinatura cancelada",
  recent: "Cadastro recente",
};

export const STATUS_TONE: Record<ProfessionalStatus, "good" | "warn" | "bad" | "neutral"> = {
  suspended: "bad",
  incomplete: "neutral",
  overdue: "bad",
  payment_pending: "warn",
  active: "good",
  free: "good",
  trial_ending: "warn",
  trial: "good",
  trial_expired: "bad",
  cancelled: "neutral",
  recent: "neutral",
};

export const ACCESS_LABELS: Record<AccessType, string> = {
  paid: "Assinatura",
  legacy: "Gratuito (conta anterior)",
  admin_free: "Gratuito (administrador)",
  trial: "Degustação",
  none: "Sem acesso configurado",
};

export const FINANCIAL_LABELS: Record<FinancialState, string> = {
  overdue: "Fatura vencida",
  pending: "Pagamento pendente",
  up_to_date: "Em dia",
  not_configured: "Sem cobrança configurada",
};

const DAY_MS = 86_400_000;
const TZ = "America/Sao_Paulo";

function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Whole calendar days from `now` to `target` in São Paulo time (negative = past). */
export function calendarDaysUntil(target: Date, now: Date) {
  const a = Date.parse(`${dayKey(now)}T00:00:00Z`);
  const b = Date.parse(`${dayKey(target)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

export function formatDateBR(value: string | null) {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** Remaining-time phrase for trial / free access; never invents a date. */
export function remainingLabel(info: ProfessionalInfo, now = new Date()) {
  if (info.access_type === "legacy") return "Sem prazo definido";
  if (!info.access_ends_at) return "Não registrado";
  const end = new Date(info.access_ends_at);
  if (info.access_type === "admin_free" && info.status === "free") return `Gratuito até ${formatDateBR(info.access_ends_at)}`;
  if (end.getTime() <= now.getTime()) return "Degustação expirada";
  const days = calendarDaysUntil(end, now);
  if (days <= 0) return "Degustação termina hoje";
  if (days === 1) return "Degustação termina amanhã";
  return `Degustação — faltam ${days} dias`;
}

export function dueLabel(info: ProfessionalInfo, now = new Date()) {
  if (!info.next_due_on) return "Sem cobrança configurada";
  const days = calendarDaysUntil(new Date(`${info.next_due_on}T12:00:00Z`), now);
  if (days < 0) return `Fatura vencida há ${-days} dia${days === -1 ? "" : "s"}`;
  if (days === 0) return "Fatura vence hoje";
  return `Fatura vence em ${days} dia${days === 1 ? "" : "s"}`;
}
