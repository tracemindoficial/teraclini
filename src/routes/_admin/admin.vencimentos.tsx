import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CalendarDays } from "lucide-react";

import { AdminMetric, AdminShell, AdminState } from "@/components/admin/AdminShell";
import { brlFromCents } from "@/lib/admin-metrics";
import { useAdminOverview } from "@/lib/data/admin";

export const Route = createFileRoute("/_admin/admin/vencimentos")({
  head: () => ({
    meta: [
      { title: "Vencimentos — Administração TeraClini" },
      { name: "description", content: "Visão administrativa dos próximos vencimentos." },
      { property: "og:title", content: "Vencimentos — Administração TeraClini" },
      { property: "og:description", content: "Visão administrativa dos próximos vencimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDueDatesPage,
});

function AdminDueDatesPage() {
  const { data, isLoading, error } = useAdminOverview();
  return (
    <AdminShell
      title="Vencimentos"
      description="Projeção baseada somente nos pagamentos cadastrados"
    >
      {isLoading ? (
        <AdminState kind="loading">Carregando vencimentos...</AdminState>
      ) : error || !data ? (
        <AdminState kind="error">Não foi possível carregar os vencimentos.</AdminState>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <AdminMetric
              label="Próximos 7 dias"
              value={brlFromCents(data.finance.due7DaysCents)}
              detail="Pagamentos pendentes no período"
              icon={<CalendarClock className="size-5" />}
            />
            <AdminMetric
              label="Próximos 30 dias"
              value={brlFromCents(data.finance.due30DaysCents)}
              detail="Pagamentos pendentes no período"
              icon={<CalendarDays className="size-5" />}
            />
          </section>
          <div className="surface mt-5 p-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Nenhuma cobrança é gerada ou confirmada automaticamente. Estes totais refletem apenas
              registros comerciais já cadastrados na Central administrativa.
            </p>
          </div>
        </>
      )}
    </AdminShell>
  );
}
