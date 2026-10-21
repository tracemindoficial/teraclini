import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AdminMetric, AdminState } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { brlFromCents } from "@/lib/admin-metrics";
import {
  useAdminSubscriptionActions,
  useAdminSubscriptionDetail,
  useAdminSubscriptionDirectory,
  useAdminSubscriptionOverview,
  type CommercialSummary,
} from "@/lib/data/subscription";
import { setAdminAccountStatus } from "@/lib/platform-admin.functions";
import {
  COMMERCIAL_STATE_LABELS,
  PROMO_CYCLES,
  PROMO_PRICE_CENTS,
  REGULAR_PRICE_CENTS,
  cyclePriceCents,
  daysRemaining,
  formatBrasilia,
  type CommercialState,
} from "@/lib/subscription-rules";

const STATE_FILTERS: (CommercialState | "all")[] = [
  "all",
  "trial",
  "admin_trial",
  "awaiting_contract",
  "active",
  "payment_pending",
  "overdue",
  "suspended",
  "cancelled",
  "legacy",
];

function modality(summary: CommercialSummary) {
  if (summary.subscription && ["active", "payment_pending"].includes(summary.state))
    return "Assinatura paga";
  if (summary.trial?.kind === "admin_trial") return "Degustação administrativa";
  if (summary.trial?.kind === "standard_trial") return "Teste padrão";
  if (summary.legacy) return "Acesso anterior";
  return "—";
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Operação não concluída.";
}

export function SubscriptionManagement() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const overview = useAdminSubscriptionOverview();
  const directory = useAdminSubscriptionDirectory(search, state, page);
  const o = overview.data;

  return (
    <div className="space-y-5">
      {o ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <AdminMetric label="Profissionais" value={o.total} />
          <AdminMetric label="Testes ativos" value={o.trial} />
          <AdminMetric label="Terminam em 2 dias" value={o.trial_ending} />
          <AdminMetric label="Expirados sem assinatura" value={o.expired} />
          <AdminMetric label="Degustações manuais" value={o.admin_trial} />
          <AdminMetric label="Assinaturas ativas" value={o.active} />
          <AdminMetric label="Pagamentos pendentes" value={o.pending} />
          <AdminMetric label="Vencidas ou suspensas" value={o.overdue_or_suspended} />
          <AdminMetric label="Acesso anterior" value={o.legacy} />
          <AdminMetric
            label="Recebido no mês"
            value={brlFromCents(o.revenue_month_cents)}
            detail="Somente pagamentos confirmados"
          />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Rotina automática:{" "}
        {o?.last_job
          ? `última execução ${formatBrasilia(o.last_job.started_at)}${o.last_job.failures ? ` com ${o.last_job.failures} falha(s)` : " sem falhas"}`
          : "ainda não executada"}
        . Avisos por e-mail: canal não configurado (somente aviso no painel).
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={state}
          onValueChange={(v) => {
            setState(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATE_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "Todas as situações" : COMMERCIAL_STATE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {directory.isLoading ? (
        <AdminState kind="loading">Carregando profissionais...</AdminState>
      ) : directory.error ? (
        <AdminState kind="error">{errorMessage(directory.error)}</AdminState>
      ) : !directory.data?.rows.length ? (
        <AdminState>Nenhum profissional encontrado.</AdminState>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Término gratuito</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Próxima cobrança</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {directory.data.rows.map((row) => (
                <tr key={row.account_id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.full_name ?? "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">{formatBrasilia(row.created_at, false)}</td>
                  <td className="px-4 py-3">{modality(row.summary)}</td>
                  <td className="px-4 py-3">
                    {row.summary.trial && !row.summary.trial.revoked_at
                      ? `${formatBrasilia(row.summary.trial.ends_at)} (${daysRemaining(row.summary.trial.ends_at)} d)`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{COMMERCIAL_STATE_LABELS[row.summary.state]}</td>
                  <td className="px-4 py-3">
                    {row.summary.subscription
                      ? `${formatBrasilia(row.summary.subscription.next_due_on, false)} · ${brlFromCents(row.summary.subscription.next_amount_cents)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelected(row.account_id)}>
                      Ver detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {directory.data && directory.data.total > 20 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span>Página {page}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={page * 20 >= directory.data.total}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      ) : null}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selected ? <SubscriptionDetailPanel accountId={selected} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SubscriptionDetailPanel({ accountId }: { accountId: string }) {
  const { data, isLoading, error } = useAdminSubscriptionDetail(accountId);
  const actions = useAdminSubscriptionActions();
  const qc = useQueryClient();
  const setStatus = useServerFn(setAdminAccountStatus);
  const [mode, setMode] = useState<null | "grant" | "extend" | "billing" | "pay">(null);

  if (isLoading) return <AdminState kind="loading">Carregando...</AdminState>;
  if (error || !data) return <AdminState kind="error">{errorMessage(error)}</AdminState>;
  const s = data.summary;

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      setMode(null);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function toggleAccess(status: "active" | "suspended") {
    const reason = window.prompt(
      status === "suspended" ? "Motivo da suspensão do acesso:" : "Motivo da reativação:",
    );
    if (!reason || reason.trim().length < 3) return;
    await run(
      () => setStatus({ data: { accountId, status, reason, confirm: true } }),
      status === "suspended" ? "Acesso suspenso." : "Acesso reativado.",
    );
  }

  async function revoke() {
    const reason = window.prompt("Motivo da revogação do acesso gratuito:");
    if (!reason || reason.trim().length < 3) return;
    await run(
      () => actions.revoke.mutateAsync({ accountId, reason, confirm: true }),
      "Acesso gratuito revogado.",
    );
  }

  return (
    <div className="space-y-5">
      <DialogHeader>
        <h3 className="text-base font-semibold">{data.full_name ?? "Profissional"}</h3>
        <p className="text-sm text-muted-foreground">{data.email}</p>
      </DialogHeader>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Situação</dt>
          <dd className="font-medium">{COMMERCIAL_STATE_LABELS[s.state]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cadastro</dt>
          <dd>{formatBrasilia(data.created_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Modalidade</dt>
          <dd>{modality(s)}</dd>
        </div>
        {s.trial ? (
          <>
            <div>
              <dt className="text-muted-foreground">Início gratuito</dt>
              <dd>{formatBrasilia(s.trial.starts_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Término gratuito</dt>
              <dd>
                {formatBrasilia(s.trial.ends_at)}
                {s.trial.revoked_at ? " (revogado)" : ` · ${daysRemaining(s.trial.ends_at)} dias`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Conversível</dt>
              <dd>{s.trial.convertible ? "Sim" : "Não"}</dd>
            </div>
          </>
        ) : null}
        {s.subscription ? (
          <>
            <div>
              <dt className="text-muted-foreground">Próxima cobrança</dt>
              <dd>{formatBrasilia(s.subscription.next_due_on, false)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Valor</dt>
              <dd>{brlFromCents(s.subscription.next_amount_cents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ciclos pagos</dt>
              <dd>{s.subscription.paid_cycles}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMode("grant")}>Liberar degustação gratuita</Button>
        {s.trial && !s.trial.revoked_at ? (
          <Button size="sm" variant="outline" onClick={() => setMode("extend")}>
            Prorrogar acesso
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => setMode("billing")}>
          Configurar cobrança
        </Button>
        {s.subscription ? (
          <Button size="sm" variant="outline" onClick={() => setMode("pay")}>
            Registrar pagamento
          </Button>
        ) : null}
        {s.state === "admin_trial" || s.legacy ? (
          <Button size="sm" variant="outline" onClick={revoke}>
            Revogar acesso gratuito
          </Button>
        ) : null}
        {data.account_status === "active" ? (
          <Button size="sm" variant="destructive" onClick={() => toggleAccess("suspended")}>
            Suspender acesso
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => toggleAccess("active")}>
            Reativar acesso
          </Button>
        )}
      </div>

      {mode === "grant" ? (
        <GrantForm
          busy={actions.grant.isPending}
          onCancel={() => setMode(null)}
          onSubmit={(v) =>
            run(() => actions.grant.mutateAsync({ accountId, ...v, confirm: true }), "Degustação liberada.")
          }
        />
      ) : null}
      {mode === "extend" ? (
        <ExtendForm
          busy={actions.extend.isPending}
          onCancel={() => setMode(null)}
          onSubmit={(v) =>
            run(() => actions.extend.mutateAsync({ accountId, ...v, confirm: true }), "Acesso prorrogado.")
          }
        />
      ) : null}
      {mode === "billing" ? (
        <BillingForm
          stateLabel={COMMERCIAL_STATE_LABELS[s.state]}
          busy={actions.configure.isPending}
          onCancel={() => setMode(null)}
          onSubmit={(v) =>
            run(
              () => actions.configure.mutateAsync({ accountId, ...v, confirm: true }),
              "Cobrança configurada.",
            )
          }
        />
      ) : null}
      {mode === "pay" && s.subscription ? (
        <PaymentForm
          cycle={s.subscription.paid_cycles + 1}
          amount={s.subscription.next_amount_cents}
          busy={actions.pay.isPending}
          onCancel={() => setMode(null)}
          onSubmit={(v) =>
            run(() => actions.pay.mutateAsync({ accountId, ...v, confirm: true }), "Pagamento registrado.")
          }
        />
      ) : null}

      <History title="Pagamentos" empty="Nenhum pagamento.">
        {data.payments.map((p, i) => (
          <li key={i}>
            Ciclo {p.cycle_number ?? "—"} · {brlFromCents(p.amount_cents)} · {p.status} ·{" "}
            {formatBrasilia(p.paid_at)}
          </li>
        ))}
      </History>
      <History title="Notificações" empty="Nenhuma notificação enviada.">
        {data.notifications.map((n, i) => (
          <li key={i}>
            {formatBrasilia(n.created_at)} · {n.title} · painel: {n.in_app_status === "delivered" ? "entregue" : n.in_app_status} · e-mail:{" "}
            {n.external_status === "not_configured" ? "canal não configurado" : n.external_status}
            {n.read_at ? " · lida" : ""}
            {n.suppressed_at ? " · suprimida (situação regularizada)" : ""}
            {n.last_error ? ` · falha: ${n.last_error}` : ""}
          </li>
        ))}
      </History>
      <History title="Histórico de alterações" empty="Sem alterações.">
        {data.events.map((e, i) => (
          <li key={i}>
            {formatBrasilia(e.created_at)} · {e.action}
            {e.reason ? ` · ${e.reason}` : ""}
            {e.previous_values ? ` · antes ${JSON.stringify(e.previous_values)}` : ""}
            {e.new_values ? ` · depois ${JSON.stringify(e.new_values)}` : ""}
          </li>
        ))}
      </History>
    </div>
  );
}

function History({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children.length ? (
        <ul className="space-y-1 break-words text-xs text-muted-foreground">{children}</ul>
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function FormBox({ children, onCancel, busy, submitLabel, onSubmit }: {
  children: React.ReactNode;
  onCancel: () => void;
  busy: boolean;
  submitLabel: string;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function GrantForm({ onSubmit, onCancel, busy }: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: {
    days: number;
    startsAt: string;
    reason: "degustacao" | "demonstracao" | "parceria" | "cortesia";
    notes: string;
    convertible: boolean;
    billingStartsOn: string | null;
  }) => void;
}) {
  const [days, setDays] = useState(30);
  const [start, setStart] = useState(todayISO());
  const [reason, setReason] = useState<"degustacao" | "demonstracao" | "parceria" | "cortesia">("degustacao");
  const [notes, setNotes] = useState("");
  const [convertible, setConvertible] = useState(true);
  const [billing, setBilling] = useState("");
  const startsAt =
    start === todayISO() ? new Date() : new Date(`${start}T00:00:00-03:00`);
  const ends = new Date(startsAt.getTime() + days * 86_400_000);
  return (
    <FormBox
      busy={busy}
      onCancel={onCancel}
      submitLabel="Liberar degustação"
      onSubmit={() => {
        if (!window.confirm(`Liberar ${days} dias gratuitos até ${formatBrasilia(ends)}? Nenhuma cobrança será gerada nesse período.`)) return;
        onSubmit({ days, startsAt: startsAt.toISOString(), reason, notes, convertible, billingStartsOn: billing || null });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Duração (dias)</Label>
          <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
        <div>
          <Label>Início</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <Label>Término calculado</Label>
          <p className="pt-2 text-sm">{formatBrasilia(ends)}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Motivo</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="degustacao">Degustação</SelectItem>
              <SelectItem value="demonstracao">Demonstração comercial</SelectItem>
              <SelectItem value="parceria">Parceria</SelectItem>
              <SelectItem value="cortesia">Cortesia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cobrança prevista a partir de (opcional)</Label>
          <Input type="date" value={billing} onChange={(e) => setBilling(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Observações internas</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={convertible} onCheckedChange={(v) => setConvertible(v === true)} />
        Pode ser convertida em assinatura paga
      </label>
    </FormBox>
  );
}

function ExtendForm({ onSubmit, onCancel, busy }: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: { days: number; reason: string }) => void;
}) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");
  return (
    <FormBox
      busy={busy}
      onCancel={onCancel}
      submitLabel="Prorrogar"
      onSubmit={() => {
        if (reason.trim().length < 3) {
          toast.error("Informe o motivo.");
          return;
        }
        if (window.confirm(`Prorrogar o acesso gratuito por ${days} dias?`)) onSubmit({ days, reason });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Dias adicionais</Label>
          <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
        <div>
          <Label>Motivo</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </FormBox>
  );
}

function BillingForm({ onSubmit, onCancel, busy, stateLabel }: {
  busy: boolean;
  stateLabel: string;
  onCancel: () => void;
  onSubmit: (v: { firstDueOn: string; promoPriceCents: number; promoCycles: number; regularPriceCents: number }) => void;
}) {
  const [first, setFirst] = useState(todayISO());
  const [promo, setPromo] = useState(PROMO_PRICE_CENTS / 100);
  const [cycles, setCycles] = useState(PROMO_CYCLES);
  const [regular, setRegular] = useState(REGULAR_PRICE_CENTS / 100);
  const promoCents = Math.round(promo * 100);
  const regularCents = Math.round(regular * 100);
  return (
    <FormBox
      busy={busy}
      onCancel={onCancel}
      submitLabel="Confirmar cobrança"
      onSubmit={() => {
        const summary = `Confirmar cobrança?\n\nPrimeira cobrança: ${formatBrasilia(first, false)}\nValor do 1º ciclo: ${brlFromCents(cyclePriceCents(1, promoCents, cycles, regularCents))}\nPeríodo promocional: ${cycles} ciclo(s) a ${brlFromCents(promoCents)}\nPreço regular depois: ${brlFromCents(regularCents)}\nSituação atual: ${stateLabel}\nRenovação: mensal, registrada manualmente a cada pagamento.`;
        if (window.confirm(summary)) onSubmit({ firstDueOn: first, promoPriceCents: promoCents, promoCycles: cycles, regularPriceCents: regularCents });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label>Primeira cobrança</Label>
          <Input type="date" min={todayISO()} value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div>
          <Label>Preço promocional (R$)</Label>
          <Input type="number" step="0.01" min={1} value={promo} onChange={(e) => setPromo(Number(e.target.value))} />
        </div>
        <div>
          <Label>Ciclos promocionais</Label>
          <Input type="number" min={0} max={24} value={cycles} onChange={(e) => setCycles(Number(e.target.value))} />
        </div>
        <div>
          <Label>Preço regular (R$)</Label>
          <Input type="number" step="0.01" min={1} value={regular} onChange={(e) => setRegular(Number(e.target.value))} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Resumo: {cycles} ciclo(s) a {brlFromCents(promoCents)}, depois {brlFromCents(regularCents)} por mês. Nenhuma cobrança automática é feita; cada pagamento é registrado aqui.
      </p>
    </FormBox>
  );
}

function PaymentForm({ onSubmit, onCancel, busy, cycle, amount }: {
  busy: boolean;
  cycle: number;
  amount: number;
  onCancel: () => void;
  onSubmit: (v: { paidAt: string; method: "pix" | "other"; transactionId: string }) => void;
}) {
  const [method, setMethod] = useState<"pix" | "other">("pix");
  const [tx, setTx] = useState("");
  return (
    <FormBox
      busy={busy}
      onCancel={onCancel}
      submitLabel="Registrar pagamento"
      onSubmit={() => {
        if (window.confirm(`Confirmar recebimento do ciclo ${cycle} (${brlFromCents(amount)}) verificado fora do sistema?`))
          onSubmit({ paidAt: new Date().toISOString(), method, transactionId: tx });
      }}
    >
      <p className="text-sm">
        Ciclo {cycle}: <strong>{brlFromCents(amount)}</strong>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Forma</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as "pix" | "other")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Identificador da transação (opcional)</Label>
          <Input value={tx} onChange={(e) => setTx(e.target.value)} />
        </div>
      </div>
    </FormBox>
  );
}
