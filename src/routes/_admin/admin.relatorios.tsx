import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { AdminMetric, AdminShell, AdminState } from "@/components/admin/AdminShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { brlFromCents } from "@/lib/admin-metrics";
import { useAdminOverview } from "@/lib/data/admin";

export const Route = createFileRoute("/_admin/admin/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Administração TeraClini" },
      { name: "description", content: "Relatórios comerciais e de utilização do TeraClini." },
      { property: "og:title", content: "Relatórios — Administração TeraClini" },
      {
        property: "og:description",
        content: "Relatórios comerciais e de utilização do TeraClini.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminReportsPage,
});
function AdminReportsPage() {
  const { data, isLoading, error } = useAdminOverview();
  if (isLoading)
    return (
      <AdminShell title="Relatórios">
        <AdminState kind="loading">Carregando relatórios...</AdminState>
      </AdminShell>
    );
  if (error || !data)
    return (
      <AdminShell title="Relatórios">
        <AdminState kind="error">Não foi possível carregar os relatórios.</AdminState>
      </AdminShell>
    );
  return (
    <AdminShell
      title="Relatórios"
      description="Dados comerciais confirmados e utilização não clínica"
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric
          label="Recebido no ano"
          value={brlFromCents(data.finance.receivedYearCents)}
          detail="Pagamentos confirmados"
        />
        <AdminMetric
          label="Receita recorrente estimada"
          value={brlFromCents(data.finance.mrrCents)}
          detail="Assinaturas ativas"
        />
        <AdminMetric
          label="Contas ativas em 7 dias"
          value={data.usage.activeAccounts7}
          detail="Desde o início da telemetria"
        />
        <AdminMetric
          label="Contas ativas em 30 dias"
          value={data.usage.activeAccounts30}
          detail="Desde o início da telemetria"
        />
      </section>
      <section className="surface mt-6 p-5">
        <h2 className="font-semibold">Cadastros por mês</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Contas realmente criadas nos últimos seis meses
        </p>
        <ChartContainer
          config={{ total: { label: "Cadastros", color: "var(--color-primary)" } }}
          className="h-72 w-full"
        >
          <BarChart data={data.registrationsByMonth}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="total" fill="var(--color-primary)" radius={4} />
          </BarChart>
        </ChartContainer>
      </section>
      <section className="surface mt-6 p-5">
        <h2 className="font-semibold">Disponibilidade dos dados</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.telemetrySince
            ? `A utilização técnica é medida desde ${new Date(data.telemetrySince).toLocaleDateString("pt-BR")}.`
            : "A utilização técnica ainda não possui eventos. Nenhum dado retroativo foi inventado."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Exportações administrativas serão liberadas depois da definição de formato e retenção;
          toda exportação ficará auditada.
        </p>
      </section>
    </AdminShell>
  );
}
