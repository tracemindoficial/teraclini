import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { useState } from "react";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { brlFromCents } from "@/lib/admin-metrics";
import { useAdminUsers } from "@/lib/data/admin";
import { useInviteAdminUser } from "@/lib/data/admin-operations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Administração TeraClini" },
      { name: "description", content: "Gestão administrativa de contas TeraClini." },
      { property: "og:title", content: "Usuários — Administração TeraClini" },
      { property: "og:description", content: "Gestão administrativa de contas TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminUsersPage,
});

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
}

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended" | "closed" | "blocked">(
    "all",
  );
  const [payment, setPayment] = useState<"all" | "confirmed" | "pending" | "overdue" | "none">(
    "all",
  );
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "last_activity">("newest");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "professional",
  });
  const inviteUser = useInviteAdminUser();
  const { data, isLoading, error } = useAdminUsers(search, status, payment, role, sort, page);

  return (
    <AdminShell
      title="Usuários"
      description="Contas, acesso, assinatura e atividade"
      action={
        <Button className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Adicionar usuário
        </Button>
      }
    >
      <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_12rem]">
        <label className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
          />
        </label>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Situação da conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="suspended">Suspensas</SelectItem>
            <SelectItem value="closed">Encerradas</SelectItem>
            <SelectItem value="blocked">Bloqueadas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={payment}
          onValueChange={(value) => {
            setPayment(value as typeof payment);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pagamentos</SelectItem>
            <SelectItem value="confirmed">Pagos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Atrasados</SelectItem>
            <SelectItem value="none">Sem registro</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Papel de acesso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="professional">Profissional</SelectItem>
            <SelectItem value="super_admin">Administrador master</SelectItem>
            <SelectItem value="support_admin">Suporte</SelectItem>
            <SelectItem value="analyst">Analista</SelectItem>
            <SelectItem value="finance_admin">Financeiro</SelectItem>
            <SelectItem value="content_admin">Conteúdo</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as typeof sort);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ordenação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="last_activity">Última atividade</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <AdminState kind="loading">Carregando contas...</AdminState>
      ) : error ? (
        <AdminState kind="error">Não foi possível carregar as contas.</AdminState>
      ) : !data?.rows.length ? (
        <AdminState>Nenhuma conta corresponde aos filtros.</AdminState>
      ) : (
        <>
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Profissional</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Mensalidade</th>
                  <th className="px-4 py-3">Próximo vencimento</th>
                  <th className="px-4 py-3">Último pagamento</th>
                  <th className="px-4 py-3">Último acesso</th>
                  <th className="px-4 py-3">Última atividade</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p>{accountStatusLabel(row.accountStatus)}</p>
                      {row.accountBlocked ? (
                        <p className="text-xs font-medium text-destructive">Bloqueada</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.platformRole ? "Administrador" : "Profissional"}
                    </td>
                    <td className="px-4 py-3">{row.planName ?? "Sem assinatura"}</td>
                    <td className="px-4 py-3">
                      {row.monthlyCents == null ? "—" : brlFromCents(row.monthlyCents)}
                    </td>
                    <td className="px-4 py-3">{formatDate(row.nextDueOn)}</td>
                    <td className="px-4 py-3">{formatDate(row.lastPaymentAt)}</td>
                    <td className="px-4 py-3">{formatDate(row.lastSignInAt)}</td>
                    <td className="px-4 py-3">{formatDate(row.lastActivityAt)}</td>
                    <td className="px-4 py-3">
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link to="/admin/usuarios/$id" params={{ id: row.id }} preload="intent">
                          Ver detalhes
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {data.total} conta{data.total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
            <DialogDescription>
              Um convite seguro será enviado para a pessoa definir o próprio acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              aria-label="Nome completo"
              placeholder="Nome completo"
              value={invite.fullName}
              onChange={(event) => setInvite({ ...invite, fullName: event.target.value })}
            />
            <Input
              aria-label="E-mail"
              type="email"
              placeholder="E-mail"
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
            />
            <Input
              aria-label="Telefone"
              placeholder="Telefone (opcional)"
              value={invite.phone}
              onChange={(event) => setInvite({ ...invite, phone: event.target.value })}
            />
            <Select
              value={invite.role}
              onValueChange={(value) => setInvite({ ...invite, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="support_admin">Suporte</SelectItem>
                <SelectItem value="analyst">Analista</SelectItem>
                <SelectItem value="finance_admin">Financeiro</SelectItem>
                <SelectItem value="content_admin">Conteúdo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                inviteUser.isPending ||
                invite.fullName.trim().length < 2 ||
                !invite.email.includes("@")
              }
              onClick={async () => {
                try {
                  await inviteUser.mutateAsync({
                    fullName: invite.fullName,
                    email: invite.email,
                    phone: invite.phone || null,
                    role: invite.role as
                      | "professional"
                      | "support_admin"
                      | "analyst"
                      | "finance_admin"
                      | "content_admin",
                    confirm: true,
                  });
                  toast.success("Convite enviado.");
                  setInviteOpen(false);
                  setInvite({ fullName: "", email: "", phone: "", role: "professional" });
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Não foi possível enviar o convite.",
                  );
                }
              }}
            >
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function accountStatusLabel(status: string) {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Desativada";
  if (status === "closed") return "Encerrada";
  return "Indisponível";
}
