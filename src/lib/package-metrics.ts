export type PackageDisplayStatus =
  | "ativo"
  | "renovacao"
  | "esgotado"
  | "expirado"
  | "cancelado"
  | "encerrado";

type PackageMetricsInput = {
  quantity: number;
  end_date: string | null;
  renewal_alert_threshold: number;
  lifecycle_status: string;
  appointments: Array<{ status: string }>;
};

export function packageUsage(item: PackageMetricsInput) {
  const used = item.appointments.filter((appointment) => appointment.status === "realizado").length;
  return { used, remaining: Math.max(item.quantity - used, 0) };
}

export function packageStatus(
  item: PackageMetricsInput,
  now = new Date(),
): PackageDisplayStatus {
  if (item.lifecycle_status === "cancelado") return "cancelado";
  if (item.lifecycle_status === "encerrado") return "encerrado";
  const { remaining } = packageUsage(item);
  if (remaining === 0) return "esgotado";
  if (item.end_date && new Date(`${item.end_date}T23:59:59`) < now) return "expirado";
  if (remaining <= item.renewal_alert_threshold) return "renovacao";
  return "ativo";
}