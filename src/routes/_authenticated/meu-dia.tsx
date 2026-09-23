import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Circle,
  Clock3,
  DoorOpen,
  MapPin,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { PatientDialog } from "@/components/PatientDialog";
import { LocationDialog } from "@/components/LocationDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOnboardingTasks } from "@/lib/account-data";
import {
  useAppointments,
  usePendingEvolutions,
  useProfile,
  type AppointmentWithRefs,
} from "@/lib/data";
import {
  APPOINTMENT_TYPES,
  formatDateLong,
  formatTime,
  greeting,
  labelOf,
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

export function AppointmentRow({
  appointment,
  highlight,
}: {
  appointment: AppointmentWithRefs;
  highlight?: boolean;
}) {
  return (
    <li>
      <Link
        to="/atendimentos/$id"
        params={{ id: appointment.id }}
        className={`surface flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)] ${
          highlight ? "border-primary" : ""
        }`}
      >
        <div className="w-14 shrink-0">
          <p className="text-base font-semibold">{formatTime(appointment.starts_at)}</p>
          <p className="text-xs text-muted-foreground">{formatTime(appointment.ends_at)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{appointment.patient?.full_name ?? "Sem paciente"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {labelOf(APPOINTMENT_TYPES, appointment.type)}
            {appointment.location ? ` · ${appointment.location.name}` : ""}
          </p>
        </div>
        <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
          {appointment.modality === "online" ? "Online" : appointment.location?.name ?? "Presencial"}
        </Badge>
      </Link>
    </li>
  );
}

function Shortcut({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
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

type SetupTask = {
  task_key: string;
  completed_at: string | null;
};

const TASK_LABELS: Record<string, { label: string; icon: typeof Circle }> = {
  profile: { label: "Perfil profissional", icon: Check },
  location: { label: "Local de atendimento", icon: MapPin },
  room: { label: "Sala de atendimento", icon: DoorOpen },
  availability: { label: "Horários de atendimento", icon: Clock3 },
  patient: { label: "Primeiro paciente", icon: UserPlus },
  appointment: { label: "Primeiro agendamento", icon: CalendarPlus },
};

function SetupChecklist({
  tasks,
  completed,
  total,
  onNewLocation,
  onNewPatient,
  onNewAppointment,
}: {
  tasks: SetupTask[];
  completed: number;
  total: number;
  onNewLocation: () => void;
  onNewPatient: () => void;
  onNewAppointment: () => void;
}) {
  const actions: Record<string, (() => void) | undefined> = {
    location: onNewLocation,
    patient: onNewPatient,
    appointment: onNewAppointment,
  };
  const availableTasks = tasks.filter((task) => TASK_LABELS[task.task_key]);

  return (
    <section className="surface mb-5 p-5" aria-labelledby="setup-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="setup-title" className="font-semibold">Prepare seu espaço</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completed} de {total} etapas concluídas
          </p>
        </div>
        <Badge variant="secondary">Configuração inicial</Badge>
      </div>
      <Progress className="mt-4" value={total > 0 ? (completed / total) * 100 : 0} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {availableTasks.map((task) => {
          const info = TASK_LABELS[task.task_key];
          if (!info) return null;
          const done = Boolean(task.completed_at);
          const action = actions[task.task_key];
          const Icon = done ? Check : info.icon;
          return (
            <div key={task.task_key} className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5">
              <span className={done ? "text-primary" : "text-muted-foreground"}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{info.label}</span>
              {!done && action ? (
                <Button type="button" variant="ghost" size="icon" onClick={action} aria-label={`Configurar ${info.label}`}>
                  <ArrowRight className="size-4" />
                </Button>
              ) : !done ? (
                <span className="text-xs text-muted-foreground">Em breve</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
