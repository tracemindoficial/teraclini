import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CalendarPlus, MapPin, Plus, Search, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { PatientDialog } from "@/components/PatientDialog";
import { LocationDialog } from "@/components/LocationDialog";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { Button } from "@/components/ui/button";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";
import { useOnboardingTasks } from "@/lib/account-data";
import {
  useAppointments,
  usePendingEvolutions,
  useProfile,
} from "@/lib/data";
import {
  formatDateLong,
  greeting,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/meu-dia")({
  head: () => ({ meta: [
    { title: "Meu Dia — Projeto Prática" },
    { name: "description", content: "Atendimentos, pendências e atalhos do seu espaço profissional." },
    { property: "og:title", content: "Meu Dia — Projeto Prática" },
    { property: "og:description", content: "Atendimentos, pendências e atalhos do seu espaço profissional." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MeuDia,
});

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function MeuDia() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const bounds = dayBounds();
  const { data: appointments, isLoading } = useAppointments(bounds);
  const { data: pending } = usePendingEvolutions();
  const { data: onboardingTasks } = useOnboardingTasks();

  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [patientOpen, setPatientOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const now = new Date();
  const next = (appointments ?? []).find((item) => new Date(item.ends_at) > now);
  const completedTasks = onboardingTasks?.filter((task) => task.completed_at).length ?? 0;
  const totalTasks = onboardingTasks?.length ?? 0;
  const onboardingComplete = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <AppShell
      title={`${greeting()}${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
      description={formatDateLong(now)}
      action={
        <Button className="gap-2" onClick={() => setAppointmentOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo agendamento</span>
        </Button>
      }
    >
      {!onboardingComplete ? (
        <SetupChecklist
          tasks={onboardingTasks ?? []}
          completed={completedTasks}
          total={totalTasks}
          onNewLocation={() => setLocationOpen(true)}
          onNewPatient={() => setPatientOpen(true)}
          onNewAppointment={() => setAppointmentOpen(true)}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Seu dia</h2>
            <span className="text-sm text-muted-foreground">
              {appointments?.length ?? 0} atendimento{(appointments?.length ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (appointments?.length ?? 0) === 0 ? (
            <div className="surface p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum atendimento hoje.</p>
              <Button className="mt-4" onClick={() => setAppointmentOpen(true)}>
                Agendar atendimento
              </Button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {appointments?.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  highlight={appointment.id === next?.id}
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-5">
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Aguardando evolução</h2>
            {pending && pending.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {pending.slice(0, 5).map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      to="/atendimentos/$id"
                      params={{ id: appointment.id }}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{appointment.patient?.full_name ?? "Atendimento"}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(appointment.starts_at).toLocaleDateString("pt-BR")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum registro pendente.</p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Atalhos</h2>
            <div className="mt-3 grid gap-2">
              <Shortcut icon={<UserPlus className="size-4" />} label="Novo paciente" onClick={() => setPatientOpen(true)} />
              <Shortcut icon={<MapPin className="size-4" />} label="Novo local" onClick={() => setLocationOpen(true)} />
              <Shortcut
                icon={<CalendarPlus className="size-4" />}
                label="Ver agenda completa"
                onClick={() => navigate({ to: "/agenda" })}
              />
              <Shortcut
                icon={<Search className="size-4" />}
                label="Buscar paciente"
                onClick={() => navigate({ to: "/pacientes" })}
              />
            </div>
          </div>
        </aside>
      </div>

      <AppointmentDialog open={appointmentOpen} onOpenChange={setAppointmentOpen} />
      <PatientDialog open={patientOpen} onOpenChange={setPatientOpen} />
      <LocationDialog open={locationOpen} onOpenChange={setLocationOpen} />
    </AppShell>
  );
}

function Shortcut({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto justify-start gap-3 px-3 py-2.5"
    >
      {icon}
      {label}
    </Button>
  );
}
