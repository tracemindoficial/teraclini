import { createFileRoute } from "@tanstack/react-router";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { brlFromCents } from "@/lib/admin-metrics";
import { useAdminSubscriptions } from "@/lib/data/admin";
import { useAdminSubscriptionPlans, useManageAdminSubscription } from "@/lib/data/admin-operations";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/assinaturas")({
  head: () => ({
    meta: [
      { title: "Assinaturas — Administração TeraClini" },
      { name: "description", content: "Ciclo comercial das contas TeraClini." },
      { property: "og:title", content: "Assinaturas — Administração TeraClini" },
      { property: "og:description", content: "Ciclo comercial das contas TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSubscriptionsPage,
});
function AdminSubscriptionsPage() {
  const { data, isLoading, error } = useAdminSubscriptions();
  const plans = useAdminSubscriptionPlans();
  const manage = useManageAdminSubscription();
  const [planByAccount, setPlanByAccount] = useState<Record<string, string>>({});
  async function apply(accountId: string, action: "change_plan" | "activate" | "restrict" | "extend" | "cancel" | "reactivate") {
    const labels = { change_plan: "trocar o plano", activate: "ativar a licença", restrict: "suspender a licença", extend: "estender o vencimento por 30 dias", cancel: "cancelar a licença", reactivate: "reativar a licença" };
    if (!window.confirm(`Confirma ${labels[action]}?`)) return;
    try {
      await manage.mutateAsync({ accountId, action, planId: action === "change_plan" ? planByAccount[accountId] : undefined, days: action === "extend" ? 30 : undefined, confirm: true });
      toast.success("Licença atualizada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a licença."); }
  }
  return (
    <AdminShell title="Assinaturas" description="Planos, mensalidades e ciclo comercial">
      {isLoading ? (
        <AdminState kind="loading">Carregando assinaturas...</AdminState>
      ) : error ? (
        <AdminState kind="error">Não foi possível carregar as assinaturas.</AdminState>
      ) : !data?.length ? (
        <AdminState>
          Nenhuma assinatura foi criada. As contas atuais permanecem sem cobrança automática.
        </AdminState>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Próximo vencimento</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {item.account?.name ?? "Conta indisponível"}
                  </td>
                  <td className="px-4 py-3">{item.plan?.name ?? "Plano indisponível"}</td>
                  <td className="px-4 py-3">{brlFromCents(item.contracted_price_cents)}</td>
                  <td className="px-4 py-3">{item.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">
                    {new Date(`${item.starts_on}T00:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(`${item.next_due_on}T00:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[22rem] flex-wrap gap-2">
                      <Select value={planByAccount[item.account_id] ?? item.plan_id} onValueChange={(value) => setPlanByAccount((current) => ({ ...current, [item.account_id]: value }))}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{plans.data?.filter((plan) => plan.is_active).map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {planByAccount[item.account_id] && planByAccount[item.account_id] !== item.plan_id ? <Button size="sm" variant="outline" onClick={() => apply(item.account_id, "change_plan")}>Trocar plano</Button> : null}
                      <Button size="sm" variant="outline" onClick={() => apply(item.account_id, "extend")}>+30 dias</Button>
                      {item.status === "active" ? <Button size="sm" variant="outline" onClick={() => apply(item.account_id, "restrict")}>Suspender</Button> : <Button size="sm" variant="outline" onClick={() => apply(item.account_id, item.status === "cancelled" ? "reactivate" : "activate")}>Ativar</Button>}
                      {item.status !== "cancelled" ? <Button size="sm" variant="destructive" onClick={() => apply(item.account_id, "cancel")}>Cancelar</Button> : null}
                    </div>
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
