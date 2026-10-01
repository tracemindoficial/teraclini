import {
  ArrowRight,
  CalendarPlus,
  Check,
  Circle,
  Clock3,
  DoorOpen,
  MapPin,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type SetupTask = { task_key: string; completed_at: string | null };

const TASK_LABELS: Record<string, { label: string; icon: typeof Circle }> = {
  profile: { label: "Perfil profissional", icon: Check },
  location: { label: "Local de atendimento", icon: MapPin },
  room: { label: "Sala de atendimento", icon: DoorOpen },
  availability: { label: "Horários de atendimento", icon: Clock3 },
  patient: { label: "Primeiro paciente", icon: UserPlus },
  appointment: { label: "Primeiro agendamento", icon: CalendarPlus },
};

export function SetupChecklist({
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
          <h2 id="setup-title" className="font-semibold">
            Prepare seu espaço
          </h2>
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
            <div
              key={task.task_key}
              className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5"
            >
              <span className={done ? "text-primary" : "text-muted-foreground"}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{info.label}</span>
              {!done && action ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={action}
                  aria-label={`Configurar ${info.label}`}
                >
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
