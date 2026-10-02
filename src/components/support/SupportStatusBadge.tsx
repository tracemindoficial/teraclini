import { Badge } from "@/components/ui/badge";
import type { SupportStatus } from "@/lib/data/support";

const labels: Record<SupportStatus, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_user: "Aguardando usuário",
  resolved: "Resolvido",
  closed: "Encerrado",
};

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return <Badge variant={status === "resolved" || status === "closed" ? "secondary" : "outline"}>{labels[status]}</Badge>;
}
