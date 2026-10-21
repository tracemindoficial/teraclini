export const AGENDA_TIMEZONE = "America/Sao_Paulo";
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
export function moveIssue(appointment: TimedAppointment, start: string, existing: TimedAppointment[], blocks: { starts_at: string; ends_at: string }[], now = new Date()) {
  if (!canMove(appointment, now)) return "Atendimentos históricos, concluídos ou em andamento não podem ser movimentados.";
  const times = movedTimes(appointment, start);
  if (Date.parse(times.starts_at) < now.getTime()) return "Não é possível mover para um horário que já passou.";
  if (hasConflict(appointment, times.starts_at, times.ends_at, existing)) return UNAVAILABLE_SLOT;
  if (blocks.some((block) => overlaps(times.starts_at, times.ends_at, block.starts_at, block.ends_at))) return UNAVAILABLE_SLOT;
  return null;
}

export function statusActions(status: string) {
  if (status === "agendado") return ["confirmado", "em_andamento", "realizado", "falta", "cancelado"];
  if (status === "confirmado") return ["em_andamento", "realizado", "falta", "cancelado"];
  if (status === "em_andamento") return ["realizado"];
  return [];
}