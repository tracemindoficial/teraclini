import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { brlFromCents } from "@/lib/admin-metrics";
import { adminKeys, useAdminPayments } from "@/lib/data/admin";
import { confirmAdminPayment } from "@/lib/platform-admin.functions";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  validateSearch: z.object({ payment: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Pagamentos — Administração TeraClini" },
      { name: "description", content: "Conciliação manual de pagamentos TeraClini." },
      { property: "og:title", content: "Pagamentos — Administração TeraClini" },
      { property: "og:description", content: "Conciliação manual de pagamentos TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPaymentsPage,
});
function AdminPaymentsPage() {
  const payment = Route.useSearch({ select: (search) => search.payment });
  const queryClient = useQueryClient();
  const confirmPayment = useServerFn(confirmAdminPayment);
  const { data, isLoading, error } = useAdminPayments();
  const mutation = useMutation({
    mutationFn: (paymentId: string) => confirmPayment({ data: { paymentId, confirm: true } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.payments });
      await queryClient.invalidateQueries({ queryKey: adminKeys.overview });
      toast.success("Pagamento confirmado e auditado.");
    },
    onError: (issue) =>
      toast.error(issue instanceof Error ? issue.message : "Não foi possível confirmar."),
  });
  return (
    <AdminShell
      title="Pagamentos"
      description="Conciliação financeira; nenhuma cobrança automática está ativa"
    >
      {isLoading ? (
        <AdminState kind="loading">Carregando pagamentos...</AdminState>
      ) : error ? (
        <AdminState kind="error">Não foi possível carregar os pagamentos.</AdminState>
      ) : !data?.length ? (
        <AdminState>
          Nenhum pagamento foi registrado. Valores não serão apresentados como receita sem
          confirmação.
        </AdminState>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.id === payment
                      ? "border-b bg-primary/10 last:border-0"
                      : "border-b last:border-0"
                  }
                >
                  <td className="px-4 py-3 font-medium">
                    {item.account?.name ?? "Conta indisponível"}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(`${item.billing_period}T00:00:00`).toLocaleDateString("pt-BR", {
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(`${item.due_on}T00:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">{brlFromCents(item.amount_cents)}</td>
                  <td className="px-4 py-3">{item.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">
                    {["pending", "under_review", "overdue"].includes(item.status) ? (
                      <Button
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Confirma que o recebimento foi verificado fora do sistema?",
                            )
                          )
                            mutation.mutate(item.id);
                        }}
                      >
                        Confirmar recebimento
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
