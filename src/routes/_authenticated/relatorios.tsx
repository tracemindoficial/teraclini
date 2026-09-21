import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { useAppointments, usePatients, usePendingEvolutions, useLocations } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [
    { title: "Meus Relatórios — Projeto Prática" },
    { name: "description", content: "Visão resumida da sua prática profissional." },
    { property: "og:title", content: "Meus Relatórios — Projeto Prática" },
    { property: "og:description", content: "Visão resumida da sua prática profissional." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReportsPage,
});

function monthBounds() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function ReportsPage() {
  const { data: appointments } = useAppointments(monthBounds());
  const { data: patients } = usePatients();
  const { data: locations } = useLocations();
  const { data: pending } = usePendingEvolutions();

  const done = (appointments ?? []).filter((item) => item.status === "realizado").length;

  return (
    <AppShell title="Relatórios" description="Uma visão simples do seu mês">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Atendimentos no mês" value={appointments?.length ?? 0} />
        <Stat label="Realizados" value={done} />
        <Stat label="Pacientes ativos" value={(patients ?? []).filter((p) => p.status === "ativo").length} />
        <Stat label="Locais cadastrados" value={locations?.length ?? 0} />
      </div>

      <div className="surface mt-5 p-5">
        <h2 className="text-sm font-semibold">Registros pendentes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {pending?.length ?? 0} atendimento{(pending?.length ?? 0) === 1 ? "" : "s"} ainda sem
          evolução registrada.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}
