import { Activity, CalendarCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { AdminMetric, AdminState } from "@/components/admin/AdminShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAdminUsageMetrics } from "@/lib/data/admin-analytics";

const moduleLabels: Record<string, string> = {
  session: "Sessão",
  dashboard: "Meu Dia",
  agenda: "Agenda",
  patients: "Pacientes",
  appointments: "Atendimentos",
  documents: "Documentos",
  packages: "Pacotes",
  reports: "Relatórios",
  settings: "Configurações",
  help: "Ajuda",
  support: "Suporte",
};
export function AdminUsageContent({ mode }: { mode: "usage" | "metrics" }) {
  const { data, isLoading, error } = useAdminUsageMetrics();
  if (isLoading) return <AdminState kind="loading">Carregando dados reais...</AdminState>;
  if (error || !data)
    return <AdminState kind="error">Não foi possível carregar os dados.</AdminState>;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminMetric
          label="Eventos em 30 dias"
          value={data.totals.events}
          icon={<Activity className="size-5" />}
        />
        <AdminMetric
          label="Contas ativas em 30 dias"
          value={data.totals.activeAccounts}
          icon={<UserRoundCheck className="size-5" />}
        />
        <AdminMetric
          label="Atendimentos concluídos"
          value={data.totals.completedAppointments}
          icon={<CalendarCheck className="size-5" />}
        />
        <AdminMetric
          label="Contas suspensas ou encerradas"
          value={data.totals.suspendedOrClosed}
          icon={<UserRoundX className="size-5" />}
        />
      </section>
      {mode === "usage" ? (
        <section className="surface p-5">
          <h2 className="font-semibold">Funcionalidades mais usadas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualizações registradas nos últimos 30 dias
          </p>
          {data.modules.length ? (
            <div className="mt-5 space-y-3">
              {data.modules.map((item) => (
                <div
                  key={item.module}
                  className="grid grid-cols-[minmax(8rem,1fr)_3fr_auto] items-center gap-3 text-sm"
                >
                  <span>{moduleLabels[item.module] ?? item.module}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(4, (item.total / (data.modules[0]?.total ?? 1)) * 100)}%`,
                      }}
                    />
                  </span>
                  <strong>{item.total}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum evento coletado.</p>
          )}
        </section>
      ) : (
        <section className="surface p-5">
          <h2 className="font-semibold">Evolução diária</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Atividade e novos cadastros nos últimos 30 dias
          </p>
          <ChartContainer
            config={{
              events: { label: "Atividade", color: "var(--color-primary)" },
              registrations: { label: "Cadastros", color: "var(--color-secondary)" },
            }}
            className="h-72 w-full"
          >
            <AreaChart data={data.daily}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="events"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.15}
              />
              <Area
                dataKey="registrations"
                stroke="var(--color-secondary-foreground)"
                fill="var(--color-secondary)"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ChartContainer>
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        {data.telemetrySince
          ? `Coleta disponível desde ${new Date(data.telemetrySince).toLocaleDateString("pt-BR")}.`
          : "A coleta ainda não possui histórico; nenhum dado retroativo foi estimado."}
      </p>
    </div>
  );
}
