import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuditEvents } from "@/lib/data/admin";

export const Route = createFileRoute("/_admin/admin/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Administração TeraClini" },
      { name: "description", content: "Histórico de ações administrativas da plataforma." },
      { property: "og:title", content: "Auditoria — Administração TeraClini" },
      { property: "og:description", content: "Histórico de ações administrativas da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAdminAuditEvents(action, page);

  return (
    <AdminShell title="Auditoria" description="Ações administrativas registradas na plataforma">
      <div className="surface mb-5 p-4">
        <Input
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          placeholder="Filtrar por ação"
          className="max-w-md"
        />
      </div>
      {isLoading ? (
        <AdminState kind="loading">Carregando atividades...</AdminState>
      ) : error ? (
        <AdminState kind="error">Não foi possível carregar as atividades.</AdminState>
      ) : !data?.rows.length ? (
        <AdminState>Nenhuma atividade administrativa registrada.</AdminState>
      ) : (
        <>
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((event) => (
                  <tr key={event.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{new Date(event.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 font-medium">{event.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{event.entity_type}</td>
                    <td className="px-4 py-3">{event.result === "success" ? "Concluída" : "Falhou"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{data.total} evento{data.total === 1 ? "" : "s"}</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
              <Button variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}