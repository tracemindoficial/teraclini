export const AGENDA_TIMEZONE = "America/Sao_Paulo";
/** Initial duration for every newly created appointment; existing appointments keep their stored duration. */
export const DEFAULT_APPOINTMENT_MINUTES = 60;
export const DURATION_OPTIONS = [30, 45, 60, 90, 120];

/** End time (HH:mm, local) derived from a local start and a duration. */
export function endTimeFor(date: string, start: string, minutes: number, timeZone = AGENDA_TIMEZONE) {
  return localParts(new Date(zonedDate(date, start, timeZone).getTime() + minutes * 60_000), timeZone).time;
}

/** Positive minutes between two local times on the same date, or null when invalid. */
export function minutesBetween(date: string, start: string, end: string, timeZone = AGENDA_TIMEZONE) {
  if (!start || !end) return null;
  const diff = Math.round((zonedDate(date, end, timeZone).getTime() - zonedDate(date, start, timeZone).getTime()) / 60_000);
  return Number.isFinite(diff) && diff > 0 ? diff : null;
}

/** Appointment type names no longer offered for new scheduling (historical rows keep them). */
export const RETIRED_APPOINTMENT_TYPE_NAMES = ["acompanhamento", "outro"];

export function selectableAppointmentTypes<T extends { id: string; name: string }>(types: T[], currentId?: string | null) {
  return types.filter((type) => type.id === currentId || !RETIRED_APPOINTMENT_TYPE_NAMES.includes(type.name.trim().toLocaleLowerCase("pt-BR")));
}

export type TimedAppointment = { id: string; starts_at: string; ends_at: string; status: string };

export function localParts(value: Date | string, timeZone = AGENDA_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function zonedDate(date: string, time = "00:00", timeZone = AGENDA_TIMEZONE) {
  const target = Date.parse(`${date}T${time}:00Z`);
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const local = localParts(new Date(instant), timeZone);
    instant += target - Date.parse(`${local.date}T${local.time}:00Z`);
  }
  return new Date(instant);
}

export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function agendaRange(anchor: string, view: string, timeZone = AGENDA_TIMEZONE) {
  let start = anchor;
  let end = addDays(start, 1);
  if (view === "semana" || view === "lista") {
    const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
    start = addDays(anchor, -((weekday + 6) % 7));
    end = addDays(start, 7);
  } else if (view === "mes") {
    start = `${anchor.slice(0, 7)}-01`;
    const next = new Date(`${start}T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    end = next.toISOString().slice(0, 10);
  }
  return { start, end, from: zonedDate(start, "00:00", timeZone).toISOString(), to: zonedDate(end, "00:00", timeZone).toISOString() };
}

export function durationMinutes(start: string, end: string) {
  return (Date.parse(end) - Date.parse(start)) / 60_000;
}

export function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return Date.parse(start) < Date.parse(otherEnd) && Date.parse(end) > Date.parse(otherStart);
}

export function canMove(appointment: TimedAppointment, now = new Date()) {
  return ["agendado", "confirmado"].includes(appointment.status) && Date.parse(appointment.starts_at) >= now.getTime();
}

export function movedTimes(appointment: TimedAppointment, start: string) {
  return { starts_at: start, ends_at: new Date(Date.parse(start) + Date.parse(appointment.ends_at) - Date.parse(appointment.starts_at)).toISOString() };
}

export function hasConflict(appointment: TimedAppointment, start: string, end: string, existing: TimedAppointment[]) {
  return existing.some((item) => item.id !== appointment.id && item.status !== "cancelado" && overlaps(start, end, item.starts_at, item.ends_at));
}

export const UNAVAILABLE_SLOT = "Este horário não está disponível. Escolha outro horário para continuar.";

/** Returns why a drag destination is invalid, or null when it may be offered for confirmation. */
export function moveIssue(appointment: TimedAppointment, start: string, existing: TimedAppointment[], blocks: { starts_at: string; ends_at: string }[], now = new Date(), rules?: AvailabilityWindow[]) {
  // Callers that know the availability windows pass them so invalid drops are refused before confirmation.
  if (!canMove(appointment, now)) return "Atendimentos históricos, concluídos ou em andamento não podem ser movimentados.";
  const times = movedTimes(appointment, start);
  if (Date.parse(times.starts_at) < now.getTime()) return "Não é possível mover para um horário que já passou.";
  if (hasConflict(appointment, times.starts_at, times.ends_at, existing)) return UNAVAILABLE_SLOT;
  if (blocks.some((block) => overlaps(times.starts_at, times.ends_at, block.starts_at, block.ends_at))) return UNAVAILABLE_SLOT;
  if (rules && !fitsAvailability({ ...appointment, ...times }, rules)) return OUTSIDE_AVAILABILITY;
  return null;
}

export const OUTSIDE_AVAILABILITY = "Este horário está fora da disponibilidade configurada.";
export type AvailabilityWindow = { weekday: number; start_time: string; end_time: string; timezone: string; is_active: boolean; valid_from: string | null; valid_until: string | null; location_id: string | null; room_id: string | null; modality: string | null };

/** Mirrors the database rule: with no active windows anything fits; otherwise one window must contain the whole appointment. */
export function fitsAvailability(appointment: TimedAppointment & { location_id?: string | null; room_id?: string | null; modality?: string | null }, rules: AvailabilityWindow[]) {
  const active = rules.filter((rule) => rule.is_active);
  if (active.length === 0) return true;
  return active.some((rule) => {
    const start = localParts(appointment.starts_at, rule.timezone);
    const end = localParts(appointment.ends_at, rule.timezone);
    const weekday = new Date(`${start.date}T12:00:00Z`).getUTCDay();
    return weekday === rule.weekday && start.date === end.date
      && start.time >= rule.start_time.slice(0, 5) && end.time <= rule.end_time.slice(0, 5)
      && (!rule.valid_from || start.date >= rule.valid_from) && (!rule.valid_until || start.date <= rule.valid_until)
      && (!rule.location_id || rule.location_id === appointment.location_id)
      && (!rule.room_id || rule.room_id === appointment.room_id)
      && (!rule.modality || rule.modality === appointment.modality);
  });
}

export function statusActions(status: string) {
  if (status === "agendado") return ["confirmado", "em_andamento", "realizado", "falta", "cancelado"];
  if (status === "confirmado") return ["em_andamento", "realizado", "falta", "cancelado"];
  if (status === "em_andamento") return ["realizado"];
  return [];
}