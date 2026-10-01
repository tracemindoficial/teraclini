import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import type { AppointmentWithRefs } from "@/lib/data";
import { APPOINTMENT_TYPES, formatTime, labelOf } from "@/lib/domain";

export function AppointmentRow({
  appointment,
  highlight,
}: {
  appointment: AppointmentWithRefs;
  highlight?: boolean;
}) {
  const packageSequence = appointment.care_package?.appointments
    .slice()
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .findIndex((item) => item.id === appointment.id);

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
          {appointment.package_id && appointment.care_package
            ? `Sessão ${Math.max(packageSequence + 1, 1)}/${appointment.care_package.quantity}`
            : appointment.modality === "online"
            ? "Online"
            : (appointment.location?.name ?? "Presencial")}
        </Badge>
      </Link>
    </li>
  );
}
