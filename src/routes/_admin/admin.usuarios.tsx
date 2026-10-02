import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
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
  const [status, setStatus] = useState<"all" | "active" | "suspended" | "closed">("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAdminUsers(search, status, page);
  return (
    <AdminShell title="Usuários" description="Contas, acesso, assinatura e atividade">
      <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
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
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Mensalidade</th>
                  <th className="px-4 py-3">Próximo vencimento</th>
                  <th className="px-4 py-3">Último pagamento</th>
                  <th className="px-4 py-3">Último acesso</th>
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
                    <td className="px-4 py-3 capitalize">{row.accountStatus}</td>
                    <td className="px-4 py-3">{row.planName ?? "Sem assinatura"}</td>
                    <td className="px-4 py-3">
                      {row.monthlyCents == null ? "—" : brlFromCents(row.monthlyCents)}
                    </td>
                    <td className="px-4 py-3">{formatDate(row.nextDueOn)}</td>
                    <td className="px-4 py-3">{formatDate(row.lastPaymentAt)}</td>
                    <td className="px-4 py-3">{formatDate(row.lastSignInAt)}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin/usuarios/$id" params={{ id: row.id }}>
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
    </AdminShell>
  );
}
