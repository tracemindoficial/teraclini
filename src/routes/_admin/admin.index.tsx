import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Banknote, CalendarClock, UserCheck, Users, UserX } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { AdminMetric, AdminShell, AdminState } from "@/components/admin/AdminShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { brlFromCents } from "@/lib/admin-metrics";
import { useAdminOverview } from "@/lib/data/admin";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({
    meta: [
      { title: "Administração Master — TeraClini" },
      { name: "description", content: "Visão administrativa da operação TeraClini." },
      { property: "og:title", content: "Administração Master — TeraClini" },
      { property: "og:description", content: "Visão administrativa da operação TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data, isLoading, error } = useAdminOverview();
  if (isLoading)
    return (
      <AdminShell title="Visão geral">
        <AdminState kind="loading">Carregando indicadores reais...</AdminState>
      </AdminShell>
    );
  if (error || !data)
    return (
      <AdminShell title="Visão geral">
        <AdminState kind="error">Não foi possível carregar os indicadores.</AdminState>
      </AdminShell>
    );
  return (
    <AdminShell title="Visão geral" description="Situação comercial e operacional do TeraClini">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminMetric
          label="Contas cadastradas"
          value={data.users.total}
          detail={`${data.users.newMonth} neste mês`}
          icon={<Users className="size-5" />}
        />
        <AdminMetric label="Novas hoje" value={data.users.newToday} detail={`${data.users.new7Days} em 7 dias`} icon={<UserCheck className="size-5" />} />
        <AdminMetric label="Suspensas ou encerradas" value={data.users.suspended + data.users.closed} detail={`${data.users.suspended} suspensas · ${data.users.closed} encerradas`} icon={<UserX className="size-5" />} />
        <AdminMetric
          label="Contas ativas"
          value={data.users.active}
          detail={`${data.users.onboardingPending} cadastros incompletos`}
          icon={<UserCheck className="size-5" />}
        />
        <AdminMetric
          label="Receita recebida no mês"
          value={brlFromCents(data.finance.receivedMonthCents)}
          detail="Somente pagamentos confirmados"
          icon={<Banknote className="size-5" />}
        />
        <AdminMetric
          label="Mensalidades vencidas"
          value={data.finance.overdueCount}
          detail={`${data.finance.pendingCount} aguardando confirmação`}
          icon={<AlertTriangle className="size-5" />}
        />
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <div className="surface p-5">
          <div className="mb-5">
            <h2 className="font-semibold">Evolução de cadastros</h2>
            <p className="text-sm text-muted-foreground">Novas contas nos últimos seis meses</p>
          </div>
          <ChartContainer
            config={{ total: { label: "Cadastros", color: "var(--color-primary)" } }}
            className="h-64 w-full"
          >
            <BarChart data={data.registrationsByMonth}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-primary)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="space-y-5">
          <div className="surface p-5">
            <h2 className="font-semibold">Vencimentos e cobranças</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt>Próximos 7 dias</dt>
                <dd className="font-semibold">{brlFromCents(data.finance.due7DaysCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Próximos 30 dias</dt>
                <dd className="font-semibold">{brlFromCents(data.finance.due30DaysCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Previsão do mês</dt>
                <dd className="font-semibold">{brlFromCents(data.finance.expectedMonthCents)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt>Receita recorrente estimada</dt>
                <dd className="font-semibold">{brlFromCents(data.finance.mrrCents)}</dd>
              </div>
            </dl>
            <Link
              to="/admin/pagamentos"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Ver pagamentos <CalendarClock className="size-4" />
            </Link>
          </div>
          <div className="surface p-5">
            <h2 className="font-semibold">Utilização</h2>
            {data.telemetrySince ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {data.usage.activeAccounts7} contas ativas em 7 dias e {data.usage.activeAccounts30}{" "}
                em 30 dias.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                A coleta técnica ainda não possui histórico. Nenhum uso retroativo foi estimado.
              </p>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
