import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import type { AppointmentWithRefs } from "@/lib/data";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, formatTime, labelOf } from "@/lib/domain";

export function AppointmentRow({
  appointment,
  highlight,
}: {
  appointment: AppointmentWithRefs;
  highlight?: boolean;
}) {
  const packageSequence =
    appointment.care_package?.appointments
      .slice()
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .findIndex((item) => item.id === appointment.id) ?? -1;

  return (
    <li>
      <Link
        to="/atendimentos/$id"
        params={{ id: appointment.id }}
        className={`surface grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-l-2 p-3.5 transition-shadow hover:shadow-[var(--shadow-lift)] sm:gap-4 sm:p-4 ${
          highlight ? "border-primary" : ""
        }`}
      >
        <div className="w-14 shrink-0">
          <p className="text-base font-semibold">{formatTime(appointment.starts_at)}</p>
          <p className="text-xs text-muted-foreground">{formatTime(appointment.ends_at)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{appointment.patient?.full_name ?? "Sem paciente"}</p>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:truncate">
            {appointment.service_name_snapshot ?? appointment.appointment_type?.name ?? labelOf(APPOINTMENT_TYPES, appointment.type)}
            {appointment.location ? ` · ${appointment.location.name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant="secondary" className="max-w-24 truncate">
            {labelOf(APPOINTMENT_STATUSES, appointment.status)}
          </Badge>
          <span className="hidden max-w-28 truncate text-[11px] text-muted-foreground sm:block">
          {appointment.package_id && appointment.care_package
            ? `Sessão ${Math.max(packageSequence + 1, 1)}/${appointment.care_package.quantity}`
            : appointment.modality === "online"
            ? "Online"
            : (appointment.location?.name ?? "Presencial")}
          </span>
        </div>
      </Link>
    </li>
  );
}
