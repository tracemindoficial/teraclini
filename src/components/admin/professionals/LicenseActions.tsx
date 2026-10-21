import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminSubscriptions } from "@/lib/data/admin";
import { useAdminSubscriptionPlans, useManageAdminSubscription } from "@/lib/data/admin-operations";

type Action = "change_plan" | "activate" | "restrict" | "cancel" | "reactivate";
const labels: Record<Action, string> = {
  change_plan: "trocar o plano",
  activate: "ativar a assinatura",
  restrict: "restringir a assinatura",
  cancel: "cancelar a assinatura",
  reactivate: "reativar a assinatura",
};

/** Plan and subscription-level actions formerly on the "Licenças" screen. */
export function LicenseActions({ accountId }: { accountId: string }) {
  const subs = useAdminSubscriptions();
  const plans = useAdminSubscriptionPlans();
  const manage = useManageAdminSubscription();
  const sub = subs.data?.find((s) => s.account_id === accountId);
  const [plan, setPlan] = useState("");
  if (!sub) return null;

  async function apply(action: Action) {
    if (!window.confirm(`Confirma ${labels[action]}?`)) return;
    try {
      await manage.mutateAsync({ accountId, action, ...(action === "change_plan" ? { planId: plan } : {}), confirm: true });
      toast.success("Assinatura atualizada.");
      setPlan("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a assinatura.");
    }
  }

  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="text-sm font-semibold">Plano da assinatura</h3>
      <p className="mt-1 text-xs text-muted-foreground">Plano atual: {sub.plan?.name ?? "não registrado"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={plan || sub.plan_id} onValueChange={setPlan}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {plans.data?.filter((p) => p.is_active).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {plan && plan !== sub.plan_id ? (
          <Button size="sm" variant="outline" disabled={manage.isPending} onClick={() => apply("change_plan")}>Trocar plano</Button>
        ) : null}
        {sub.status === "cancelled" ? (
          <Button size="sm" variant="outline" disabled={manage.isPending} onClick={() => apply("reactivate")}>Reativar assinatura</Button>
        ) : (
          <>
            {sub.status === "restricted" ? (
              <Button size="sm" variant="outline" disabled={manage.isPending} onClick={() => apply("activate")}>Ativar assinatura</Button>
            ) : null}
            <Button size="sm" variant="destructive" disabled={manage.isPending} onClick={() => apply("cancel")}>Cancelar assinatura</Button>
          </>
        )}
      </div>
    </div>
  );
}
