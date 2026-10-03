import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, LockKeyhole, LockKeyholeOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminMetric, AdminShell, AdminState } from "@/components/admin/AdminShell";
import { AdminUserOperations } from "@/components/admin/AdminUserOperations";
import { Button } from "@/components/ui/button";
import {
  useAdminUserDetail,
  useSetAdminAccountBlock,
  useSetAdminAccountStatus,
  useSetPlatformAdminRole,
} from "@/lib/data/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminUserDeletionPreview,
  useAdminUserHistory,
  useCloseAdminUserAccount,
} from "@/lib/data/admin-operations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { brlFromCents } from "@/lib/admin-metrics";

export const Route = createFileRoute("/_admin/admin/usuarios/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da conta — Administração TeraClini" },
      { name: "description", content: "Dados operacionais de uma conta TeraClini." },
      { property: "og:title", content: "Detalhes da conta — Administração TeraClini" },
      { property: "og:description", content: "Dados operacionais de uma conta TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminUserDetailPage,
});

function AdminUserDetailPage() {
  const { id } = useParams({ from: "/_admin/admin/usuarios/$id" });
  const { data, isLoading, error } = useAdminUserDetail(id);
  const setStatus = useSetAdminAccountStatus(id);
  const setBlock = useSetAdminAccountBlock(id);
  const setRole = useSetPlatformAdminRole(id);
  const history = useAdminUserHistory(id);
  const [accessAction, setAccessAction] = useState<
    "activate" | "deactivate" | "block" | "unblock" | null
  >(null);
  const [reason, setReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const deletionPreview = useAdminUserDeletionPreview(id, deleteOpen);
  const closeUser = useCloseAdminUserAccount();

  async function confirmAccessAction() {
    if (!data?.accountId) return;
    try {
      if (accessAction === "activate" || accessAction === "deactivate") {
        await setStatus.mutateAsync({
          accountId: data.accountId,
          status: accessAction === "activate" ? "active" : "suspended",
          reason,
          confirm: true,
        });
        toast.success(accessAction === "activate" ? "Conta ativada." : "Conta desativada.");
      } else if (accessAction === "block" || accessAction === "unblock") {
        await setBlock.mutateAsync({
          accountId: data.accountId,
          blocked: accessAction === "block",
          reason,
          confirm: true,
        });
        toast.success(accessAction === "block" ? "Conta bloqueada." : "Conta desbloqueada.");
      }
      setAccessAction(null);
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível alterar o acesso da conta.",
      );
    }
  }

  if (isLoading)
    return (
      <AdminShell title="Conta">
        <AdminState kind="loading">Carregando conta...</AdminState>
      </AdminShell>
    );
  if (error || !data)
    return (
      <AdminShell title="Conta">
        <AdminState kind="error">Conta não encontrada.</AdminState>
      </AdminShell>
    );

  return (
    <AdminShell
      title={data.name}
      description="Informações cadastrais e indicadores operacionais"
      action={
        data.accountId ? (
          <div className="flex flex-wrap gap-2">
            {data.accountBlocked ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={setBlock.isPending}
                onClick={() => setAccessAction("unblock")}
              >
                <LockKeyholeOpen className="size-4" />
                Desbloquear
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                disabled={setBlock.isPending}
                onClick={() => setAccessAction("block")}
              >
                <LockKeyhole className="size-4" />
                Bloquear
              </Button>
            )}
            {data.accountStatus === "active" ? (
              <Button
                variant="destructive"
                className="gap-2"
                disabled={setStatus.isPending}
                onClick={() => setAccessAction("deactivate")}
              >
                <Ban className="size-4" />
                Desativar
              </Button>
            ) : (
              <Button
                className="gap-2"
                disabled={setStatus.isPending}
                onClick={() => setAccessAction("activate")}
              >
                <CheckCircle2 className="size-4" />
                Ativar
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <Link
        to="/admin/usuarios"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft className="size-4" />
        Voltar para usuários
      </Link>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric label="Pacientes" value={data.counts.patients} />
        <AdminMetric label="Atendimentos" value={data.counts.appointments} />
        <AdminMetric label="Documentos" value={data.counts.documents} />
        <AdminMetric label="Pacotes" value={data.counts.packages} />
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <dl className="surface divide-y p-5">
          <DetailRow label="E-mail" value={data.email} />
          <DetailRow label="Profissão" value={data.profession ?? "—"} />
          <DetailRow label="Situação" value={statusLabel(data.accountStatus)} />
          <DetailRow label="Bloqueio" value={data.accountBlocked ? "Bloqueada" : "Sem bloqueio"} />
          {data.blockReason ? <DetailRow label="Justificativa" value={data.blockReason} /> : null}
          <DetailRow
            label="Última alteração de acesso"
            value={
              data.accessStateChangedAt
                ? new Date(data.accessStateChangedAt).toLocaleString("pt-BR")
                : "—"
            }
          />
          <DetailRow label="Perfil" value={data.platformRole ? "Administrador" : "Profissional"} />
          <DetailRow
            label="Cadastro"
            value={new Date(data.createdAt).toLocaleDateString("pt-BR")}
          />
          <DetailRow
            label="Último acesso"
            value={data.lastSignInAt ? new Date(data.lastSignInAt).toLocaleString("pt-BR") : "—"}
          />
          <DetailRow
            label="Onboarding"
            value={data.onboardingCompleted ? "Concluído" : "Pendente"}
          />
        </dl>
        <div className="surface p-5">
          <h2 className="font-semibold">Atividade recente</h2>
          {!data.activity.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma atividade técnica registrada.
            </p>
          ) : (
            <ul className="mt-3 divide-y text-sm">
              {data.activity.map((event) => (
                <li key={event.id} className="flex justify-between gap-3 py-3">
                  <span className="font-medium">{event.module}</span>
                  <time className="text-muted-foreground">
                    {new Date(event.occurred_at).toLocaleString("pt-BR")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <AdminUserOperations
        user={{
          id: data.id,
          email: data.email,
          name: data.name,
          profession: data.profession,
          professionalRegistry: data.professionalRegistry,
          city: data.city,
          state: data.state,
          phone: data.phone,
          careMode: data.careMode,
        }}
      />
      <section className="surface mt-6 p-5">
        <h2 className="font-semibold">Linha do tempo operacional</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Alterações administrativas, acesso e licença; sem conteúdo clínico.
        </p>
        {history.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando histórico...</p>
        ) : history.error ? (
          <p className="mt-4 text-sm text-destructive">Não foi possível carregar o histórico.</p>
        ) : !history.data?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum evento operacional registrado.
          </p>
        ) : (
          <ol className="mt-4 divide-y">
            {history.data.map((event) => (
              <li
                key={event.id}
                className="grid gap-1 py-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,1fr)_auto]"
              >
                <span className="text-sm font-medium">{event.type.replaceAll("_", " ")}</span>
                <span className="text-sm text-muted-foreground">
                  {event.detail || "Alteração registrada"}
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString("pt-BR")}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
      <Dialog
        open={Boolean(accessAction)}
        onOpenChange={(open) => {
          if (!open) {
            setAccessAction(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{accessActionTitle(accessAction)}</DialogTitle>
            <DialogDescription>
              Esta ação será aplicada a {data.name}, preservará todos os dados e ficará registrada.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Justificativa administrativa"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Justificativa administrativa"
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessAction(null)}>
              Cancelar
            </Button>
            <Button
              variant={
                accessAction === "deactivate" || accessAction === "block"
                  ? "destructive"
                  : "default"
              }
              disabled={
                setStatus.isPending ||
                setBlock.isPending ||
                ((accessAction === "deactivate" || accessAction === "block") &&
                  reason.trim().length < 3)
              }
              onClick={confirmAccessAction}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="font-semibold">Permissão administrativa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            É adicional ao espaço profissional e nunca substitui a conta.
          </p>
          <Select
            value={data.platformRole ?? "professional"}
            onValueChange={async (value) => {
              if (!window.confirm("Confirma a alteração desta permissão?")) return;
              try {
                await setRole.mutateAsync({
                  userId: id,
                  role:
                    value === "professional"
                      ? null
                      : (value as
                          | "super_admin"
                          | "support_admin"
                          | "analyst"
                          | "finance_admin"
                          | "content_admin"),
                  confirm: true,
                });
                toast.success("Permissão atualizada.");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível atualizar a permissão.",
                );
              }
            }}
          >
            <SelectTrigger className="mt-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Profissional</SelectItem>
              <SelectItem value="super_admin">Administrador master</SelectItem>
              <SelectItem value="support_admin">Suporte</SelectItem>
              <SelectItem value="analyst">Analista</SelectItem>
              <SelectItem value="finance_admin">Financeiro</SelectItem>
              <SelectItem value="content_admin">Conteúdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="surface p-5">
          <h2 className="font-semibold">Assinatura</h2>
          {data.subscription ? (
            <dl className="mt-3 divide-y">
              <DetailRow
                label="Plano"
                value={data.subscription.plan?.name ?? "Plano indisponível"}
              />
              <DetailRow label="Situação" value={data.subscription.status} />
              <DetailRow
                label="Próximo vencimento"
                value={new Date(`${data.subscription.next_due_on}T00:00:00`).toLocaleDateString(
                  "pt-BR",
                )}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma assinatura vinculada.</p>
          )}
        </div>
      </section>
      <section className="surface mt-6 p-5">
        <h2 className="font-semibold">Pagamentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registros administrativos locais. A confirmação em tempo real depende de um gateway
          integrado.
        </p>
        {data.payments.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Situação</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Transação</th>
                  <th>Atualização</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="py-3">{payment.status}</td>
                    <td>{brlFromCents(payment.amount_cents)}</td>
                    <td>{new Date(`${payment.due_on}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td>{payment.transaction_id ?? payment.charge_id ?? "Sem identificador"}</td>
                    <td>{new Date(payment.updated_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Sem registro de pagamento.</p>
        )}
      </section>
      <section className="surface mt-6 p-5">
        <h2 className="font-semibold">Chamados recentes</h2>
        {data.support.length ? (
          <ul className="mt-3 divide-y text-sm">
            {data.support.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to="/admin/suporte"
                  search={{ ticket: ticket.id }}
                  className="flex flex-wrap justify-between gap-3 py-3 hover:text-primary"
                >
                  <span className="font-medium">{ticket.subject}</span>
                  <span className="text-muted-foreground">{ticket.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum chamado registrado.</p>
        )}
      </section>
      <section className="surface mt-6 border-destructive/30 p-5">
        <h2 className="font-semibold">Encerrar conta vazia</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preserva o registro administrativo e encerra o acesso somente quando não há dados
          vinculados.
        </p>
        <Button variant="destructive" className="mt-4 gap-2" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" />
          Verificar encerramento
        </Button>
      </section>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar conta vazia</DialogTitle>
            <DialogDescription>
              O acesso será encerrado e o registro mínimo preservado. Dados vinculados bloqueiam
              esta ação.
            </DialogDescription>
          </DialogHeader>
          {deletionPreview.isLoading ? (
            <p className="text-sm text-muted-foreground">Verificando dependências...</p>
          ) : deletionPreview.error ? (
            <p className="text-sm text-destructive">Não foi possível verificar a conta.</p>
          ) : deletionPreview.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Pacientes: {deletionPreview.data.counts.patients}</span>
                <span>Atendimentos: {deletionPreview.data.counts.appointments}</span>
                <span>Documentos: {deletionPreview.data.counts.documents}</span>
                <span>Pagamentos: {deletionPreview.data.counts.payments}</span>
                <span>Assinaturas: {deletionPreview.data.counts.subscriptions}</span>
                <span>Suporte: {deletionPreview.data.counts.support}</span>
              </div>
              {deletionPreview.data.canDelete ? (
                <Input
                  aria-label="Confirme o e-mail"
                  placeholder="Digite o e-mail da conta"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                />
              ) : (
                <p className="text-sm text-destructive">{deletionPreview.data.reason}</p>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={
                !deletionPreview.data?.canDelete ||
                deleteConfirmation.toLowerCase() !== data.email.toLowerCase() ||
                closeUser.isPending
              }
              onClick={async () => {
                try {
                  await closeUser.mutateAsync({
                    userId: id,
                    confirmation: deleteConfirmation,
                    confirm: true,
                  });
                  toast.success("Conta vazia encerrada.");
                  window.location.href = "/admin/usuarios";
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Não foi possível encerrar a conta.",
                  );
                }
              }}
            >
              Encerrar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Desativada";
  if (status === "closed") return "Encerrada";
  return "Sem conta vinculada";
}

function accessActionTitle(action: "activate" | "deactivate" | "block" | "unblock" | null) {
  if (action === "activate") return "Ativar conta";
  if (action === "deactivate") return "Desativar conta";
  if (action === "block") return "Bloquear conta";
  return "Desbloquear conta";
}
