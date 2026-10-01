import { Link } from "@tanstack/react-router";

import { PackageStatusBadge } from "@/components/packages/PackageStatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/domain";
import { packageUsage, type CarePackageWithRefs } from "@/lib/data";

export function PackageCard({
  item,
  onRenew,
}: {
  item: CarePackageWithRefs;
  onRenew?: ((item: CarePackageWithRefs) => void) | undefined;
}) {
  const { used, remaining } = packageUsage(item);
  const progress = Math.min((used / item.quantity) * 100, 100);

  return (
    <article className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{item.patient.full_name}</h3>
          <p className="text-sm text-muted-foreground">
            {item.appointment_type?.name ?? "Sem serviço definido"}
          </p>
        </div>
        <PackageStatusBadge item={item} />
      </div>
      <div className="mt-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>{used} de {item.quantity} utilizadas</span>
          <span className="font-medium">{remaining} restante{remaining === 1 ? "" : "s"}</span>
        </div>
        <Progress value={progress} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Início em {formatDate(item.start_date)} · {item.total_value === null ? "Valor a definir" : item.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/pacotes/$id" params={{ id: item.id }}>Ver pacote</Link>
          </Button>
          {item.lifecycle_status === "ativo" && onRenew ? <Button size="sm" onClick={() => onRenew(item)}>Renovar</Button> : null}
        </div>
      </div>
    </article>
  );
}