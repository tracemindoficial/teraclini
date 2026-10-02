import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AdminMetric, AdminShell, AdminState } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminUserDetail, useSetAdminAccountStatus } from "@/lib/data/admin";

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

  if (isLoading) return <AdminShell title="Conta"><AdminState kind="loading">Carregando conta...</AdminState></AdminShell>;
  if (error || !data) return <AdminShell title="Conta"><AdminState kind="error">Conta não encontrada.</AdminState></AdminShell>;

  return (
    <AdminShell
      title={data.name}
      description="Informações cadastrais e indicadores operacionais"
      action={data.accountId ? (
        data.accountStatus === "active" ? (
          <Button variant="destructive" className="gap-2" disabled={setStatus.isPending} onClick={() => changeStatus("suspended")}><Ban className="size-4" />Suspender</Button>
        ) : (
          <Button className="gap-2" disabled={setStatus.isPending} onClick={() => changeStatus("active")}><CheckCircle2 className="size-4" />Reativar</Button>
        )
      ) : undefined}
    >
      <Link to="/admin/usuarios" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="size-4" />Voltar para usuários</Link>
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
          <DetailRow label="Cadastro" value={new Date(data.createdAt).toLocaleDateString("pt-BR")} />
          <DetailRow label="Último acesso" value={data.lastSignInAt ? new Date(data.lastSignInAt).toLocaleString("pt-BR") : "—"} />
          <DetailRow label="Onboarding" value={data.onboardingCompleted ? "Concluído" : "Pendente"} />
        </dl>
        <div className="surface p-5">
          <h2 className="font-semibold">Atividade recente</h2>
          {!data.activity.length ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma atividade técnica registrada.</p> : (
            <ul className="mt-3 divide-y text-sm">{data.activity.map((event) => <li key={event.id} className="flex justify-between gap-3 py-3"><span className="font-medium">{event.module}</span><time className="text-muted-foreground">{new Date(event.occurred_at).toLocaleString("pt-BR")}</time></li>)}</ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr]"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>;
}

function statusLabel(status: string) {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Suspensa";
  if (status === "closed") return "Encerrada";
  return "Sem conta vinculada";
}