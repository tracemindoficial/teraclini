import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { brlFromCents } from "@/lib/admin-metrics";
import {
  useMarkNotificationRead,
  useMyCommercialStatus,
  useRequestContract,
} from "@/lib/data/subscription";
import {
  COMMERCIAL_STATE_LABELS,
  PROMO_CYCLES,
  PROMO_PRICE_CENTS,
  REGULAR_PRICE_CENTS,
  daysRemaining,
  formatBrasilia,
  hasCommercialAccess,
} from "@/lib/subscription-rules";

export function MySubscriptionPage() {
  const { data, isLoading, error } = useMyCommercialStatus();
  const request = useRequestContract();
  const markRead = useMarkNotificationRead();
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando assinatura...</p>;
  if (error || !data)
    return <p className="text-sm text-destructive">Não foi possível carregar sua assinatura.</p>;
  const sub = data.subscription;
  const promo = sub?.promo_price_cents ?? PROMO_PRICE_CENTS;
  const cycles = sub?.promo_cycles ?? PROMO_CYCLES;
  const regular = sub?.regular_price_cents ?? REGULAR_PRICE_CENTS;
  const blocked = !hasCommercialAccess(data.state);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="surface space-y-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">Situação</p>
          <p className="font-display text-2xl font-semibold">
            {COMMERCIAL_STATE_LABELS[data.state]}
          </p>
        </div>
        {blocked ? (
          <Alert variant="destructive">
            <AlertTitle>Acesso aos módulos pausado</AlertTitle>
            <AlertDescription>
              Seus pacientes, prontuários, agendamentos e registros continuam preservados. Conclua a
              contratação para voltar a usar o sistema.
            </AlertDescription>
          </Alert>
        ) : null}
        {data.trial && !data.trial.revoked_at ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">
                {data.trial.kind === "admin_trial" ? "Degustação" : "Teste gratuito"} — início
              </dt>
              <dd>{formatBrasilia(data.trial.starts_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Término</dt>
              <dd>{formatBrasilia(data.trial.ends_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dias restantes</dt>
              <dd>{daysRemaining(data.trial.ends_at)}</dd>
            </div>
          </dl>
        ) : null}
        {sub ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Próxima cobrança</dt>
              <dd>{formatBrasilia(sub.next_due_on, false)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Valor</dt>
              <dd>{brlFromCents(sub.next_amount_cents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ciclos pagos</dt>
              <dd>{sub.paid_cycles}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="surface space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Plano TeraClini</h2>
        <p className="text-sm text-muted-foreground">
          Plano único mensal, com todas as funcionalidades e futuras atualizações incluídas.
        </p>
        <ul className="space-y-1 text-sm">
          <li>
            1º ao {cycles}º ciclo: <strong>{brlFromCents(promo)}</strong> por mês
          </li>
          <li>
            A partir do {cycles + 1}º ciclo: <strong>{brlFromCents(regular)}</strong> por mês
          </li>
          <li>Teste gratuito de 7 dias para novos cadastros</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          A contratação é concluída com a equipe TeraClini. Nenhuma cobrança é feita
          automaticamente ao fim do período gratuito.
        </p>
        <Button
          className="w-full"
          disabled={request.isPending || data.state === "active"}
          onClick={() =>
            request.mutate(undefined, {
              onSuccess: () =>
                toast.success("Solicitação registrada. A equipe entrará em contato."),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          {data.contract_requested_at ? "Solicitar contratação novamente" : "Quero contratar"}
        </Button>
        {data.contract_requested_at ? (
          <p className="text-xs text-muted-foreground">
            Última solicitação: {formatBrasilia(data.contract_requested_at)}
          </p>
        ) : null}
      </section>

      {data.notifications.length ? (
        <section className="surface space-y-3 p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Avisos</h2>
          {data.notifications.map((n) => (
            <article key={n.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{n.title}</p>
              <p className="mt-1 text-muted-foreground">{n.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatBrasilia(n.created_at)}</span>
                {!n.read_at ? (
                  <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                    Marcar como lido
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
