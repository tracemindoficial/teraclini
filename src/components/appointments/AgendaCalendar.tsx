import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import { CalendarClock, LockKeyhole, Video } from "lucide-react";
import type { AppointmentWithRefs, AvailabilityRule, ScheduleBlock } from "@/lib/data";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, labelOf } from "@/lib/domain";
import { canMove, localParts } from "@/lib/agenda-rules";

export function AgendaCalendar({ appointments, blocks, availability, anchor, view, timeZone, onSelect, onCreate, onMove, onBlock }: {
  appointments: AppointmentWithRefs[];
  blocks: ScheduleBlock[];
  availability: AvailabilityRule[];
  anchor: string;
  view: "dia" | "semana" | "mes";
  timeZone: string;
  onSelect: (appointment: AppointmentWithRefs) => void;
  onCreate: (date: string, time: string) => void;
  onMove: (appointment: AppointmentWithRefs, start: string) => Promise<void>;
  onBlock: (block: ScheduleBlock) => void;
}) {
  const calendar = useRef<FullCalendar>(null);
  useEffect(() => {
    const api = calendar.current?.getApi();
    api?.changeView(view === "dia" ? "timeGridDay" : view === "mes" ? "dayGridMonth" : "timeGridWeek", anchor);
  }, [view, anchor]);
  const times = [...appointments.flatMap((item) => [localParts(item.starts_at, timeZone).time, localParts(item.ends_at, timeZone).time]), ...availability.flatMap((item) => [item.start_time, item.end_time])];
  const earliest = Math.min(7, ...times.map((time) => Number(time.slice(0, 2))));
  const latest = Math.min(24, Math.max(21, ...times.map((time) => Number(time.slice(0, 2)) + 1)));
  return <div className="agenda-calendar overflow-x-auto rounded-lg border border-border bg-card">
    <div className={view === "semana" ? "min-w-[1080px]" : view === "mes" ? "min-w-[700px]" : "min-w-0"}>
      <FullCalendar ref={calendar}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, luxonPlugin]}
        locale={ptLocale} timeZone={timeZone} firstDay={1} weekends
        initialDate={anchor} initialView={view === "dia" ? "timeGridDay" : view === "mes" ? "dayGridMonth" : "timeGridWeek"}
        headerToolbar={false} allDaySlot={false} height="auto"
        slotDuration="00:30:00" slotLabelInterval="00:30:00" snapDuration="00:30:00"
        slotMinTime={`${String(earliest).padStart(2, "0")}:00:00`} slotMaxTime={`${String(latest).padStart(2, "0")}:00:00`}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        dayHeaderFormat={{ weekday: "short", day: "2-digit", month: "2-digit" }}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventDisplay="block" eventMinHeight={0} eventShortHeight={58}
        slotEventOverlap={false} eventOverlap={false} nowIndicator
        editable eventDurationEditable={false} longPressDelay={650}
        eventAllow={(_drop, event) => Boolean(event && event.extendedProps.kind === "appointment" && canMove(event.extendedProps.appointment))}
        events={[
          ...appointments.map((appointment) => ({ id: appointment.id, start: appointment.starts_at, end: appointment.ends_at, title: appointment.patient?.full_name ?? "Sem paciente", editable: canMove(appointment), classNames: [`agenda-status-${appointment.status}`], extendedProps: { kind: "appointment", appointment } })),
          ...blocks.map((block) => ({ id: `block-${block.id}`, start: block.starts_at, end: block.ends_at, title: block.reason, editable: false, classNames: ["agenda-block"], extendedProps: { kind: "block", block } })),
          ...availability.filter((rule) => rule.is_active).map((rule) => ({ id: `availability-${rule.id}`, daysOfWeek: [rule.weekday], startTime: rule.start_time, endTime: rule.end_time, startRecur: rule.valid_from ?? undefined, endRecur: rule.valid_until ? `${rule.valid_until}T23:59:59` : undefined, display: "background", classNames: ["agenda-available"] })),
        ]}
        dateClick={(info) => { const local = localParts(info.date, timeZone); onCreate(local.date, view === "mes" ? "09:00" : local.time); }}
        eventClick={(info) => { if (info.event.extendedProps.kind === "block") onBlock(info.event.extendedProps.block); else onSelect(info.event.extendedProps.appointment); }}
        eventDrop={async (info) => {
          const start = info.event.start;
          if (!start) return info.revert();
          try { await onMove(info.event.extendedProps.appointment, start.toISOString()); } catch { info.revert(); }
        }}
        eventDidMount={(info) => {
          if (info.event.display === "background") return;
          info.el.setAttribute("role", "button"); info.el.setAttribute("tabindex", "0");
          info.el.setAttribute("aria-label", `${info.event.title}, ${localParts(info.event.start ?? anchor, timeZone).time}`);
          info.el.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); info.el.click(); } });
        }}
        eventContent={(info) => {
          if (info.event.extendedProps.kind === "block") return <div className="agenda-event-content"><span className="flex items-center gap-1 text-[11px]"><LockKeyhole className="size-3" />Bloqueio · {info.timeText}</span><strong className="agenda-patient">{info.event.title}</strong></div>;
          const appointment = info.event.extendedProps.appointment as AppointmentWithRefs | undefined;
          if (!appointment) return null;
          const local = appointment.modality === "online" ? "Online" : appointment.location?.name ?? "Presencial";
          return <div className="agenda-event-content" title={`${appointment.patient?.full_name ?? "Sem paciente"} · ${local} · ${labelOf(APPOINTMENT_STATUSES, appointment.status)}`}>
            <span className="agenda-event-time">{localParts(appointment.starts_at, timeZone).time}–{localParts(appointment.ends_at, timeZone).time}<span className="ml-1">· {labelOf(APPOINTMENT_STATUSES, appointment.status)}</span></span>
            <strong className="agenda-patient">{appointment.patient?.full_name ?? "Sem paciente"}</strong>
            <span className="agenda-event-place">{appointment.modality === "online" ? <Video className="size-3 shrink-0" /> : null}{local}{appointment.room ? ` · ${appointment.room.name}` : ""}{appointment.package_id ? <CalendarClock className="ml-auto size-3 shrink-0" /> : null}</span>
            <span className="agenda-event-service">{appointment.service_name_snapshot ?? appointment.appointment_type?.name ?? labelOf(APPOINTMENT_TYPES, appointment.type)}</span>
          </div>;
        }}
      />
    </div>
  </div>;
}