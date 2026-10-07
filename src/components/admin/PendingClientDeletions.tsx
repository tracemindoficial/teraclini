import { Button } from "@/components/ui/button";
import { useCloseAdminUserAccount, usePendingAdminDeletions } from "@/lib/data/admin-operations";
import { toast } from "sonner";

export function PendingClientDeletions() {
  const pending = usePendingAdminDeletions();
  const complete = useCloseAdminUserAccount();
  if (!pending.data?.length) return null;
  return <section className="mb-5 space-y-3 border-l-2 border-destructive pl-4">
    <h2 className="font-semibold">Exclusões com finalização pendente</h2>
    {pending.data.map((job) => <div key={job.user_id} className="flex flex-wrap items-center gap-3 text-sm">
      <span>{job.user_id}</span>
      <Button variant="outline" disabled={complete.isPending} onClick={async () => {
        if (!window.confirm("Retomar a exclusão já confirmada?")) return;
        try {
          await complete.mutateAsync({ userId: job.user_id, confirmation: "retomar", confirm: true });
          toast.success("Exclusão finalizada; auditoria preservada.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Não foi possível finalizar.");
        }
      }}>Retomar finalização</Button>
    </div>)}
  </section>;
}