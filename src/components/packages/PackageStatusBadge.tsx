import { Badge } from "@/components/ui/badge";
import { packageStatus, type CarePackageWithRefs } from "@/lib/data";

const LABELS = {
  ativo: "Ativo",
  renovacao: "Próximo da renovação",
  esgotado: "Esgotado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  encerrado: "Encerrado",
} as const;

export function PackageStatusBadge({ item }: { item: CarePackageWithRefs }) {
  const status = packageStatus(item);
  return (
    <Badge variant={status === "ativo" ? "secondary" : status === "renovacao" ? "outline" : "default"}>
      {LABELS[status]}
    </Badge>
  );
}