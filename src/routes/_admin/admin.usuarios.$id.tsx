import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AdminMetric, AdminShell, AdminState } from "@/components/admin/AdminShell";
import { AdminUserOperations } from "@/components/admin/AdminUserOperations";
import { Button } from "@/components/ui/button";
import {
  useAdminUserDetail,
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
import { useAdminUserHistory } from "@/lib/data/admin-operations";

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
  const setRole = useSetPlatformAdminRole(id);
  const history = useAdminUserHistory(id);

  async function changeStatus(status: "active" | "suspended") {
    if (!data?.accountId) return;
    const label = status === "active" ? "reativar" : "suspender";
    if (!window.confirm(`Deseja realmente ${label} esta conta?`)) return;
    try {
      await setStatus.mutateAsync({ accountId: data.accountId, status, confirm: true });
      toast.success(status === "active" ? "Conta reativada." : "Conta suspensa.");
    } catch {
      toast.error("Não foi possível alterar a situação da conta.");
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
          data.accountStatus === "active" ? (
            <Button
              variant="destructive"
              className="gap-2"
              disabled={setStatus.isPending}
              onClick={() => changeStatus("suspended")}
            >
              <Ban className="size-4" />
              Suspender
            </Button>
          ) : (
            <Button
              className="gap-2"
              disabled={setStatus.isPending}
              onClick={() => changeStatus("active")}
            >
              <CheckCircle2 className="size-4" />
              Reativar
            </Button>
          )
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
      <AdminUserOperations user={{ id: data.id, email: data.email, name: data.name, profession: data.profession, professionalRegistry: data.professionalRegistry, city: data.city, state: data.state, phone: data.phone, careMode: data.careMode }} />
      <section className="surface mt-6 p-5">
        <h2 className="font-semibold">Linha do tempo operacional</h2>
        <p className="mt-1 text-sm text-muted-foreground">Alterações administrativas, acesso e licença; sem conteúdo clínico.</p>
        {history.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Carregando histórico...</p> : history.error ? <p className="mt-4 text-sm text-destructive">Não foi possível carregar o histórico.</p> : !history.data?.length ? <p className="mt-4 text-sm text-muted-foreground">Nenhum evento operacional registrado.</p> : <ol className="mt-4 divide-y">{history.data.map((event) => <li key={event.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,1fr)_auto]"><span className="text-sm font-medium">{event.type.replaceAll("_", " ")}</span><span className="text-sm text-muted-foreground">{event.detail || "Alteração registrada"}</span><time className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}</time></li>)}</ol>}
      </section>
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
  if (status === "suspended") return "Suspensa";
  if (status === "closed") return "Encerrada";
  return "Sem conta vinculada";
}
