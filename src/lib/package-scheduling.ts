import { AGENDA_TIMEZONE, addDays, fitsAvailability, overlaps, zonedDate, type AvailabilityWindow, type TimedAppointment } from "./agenda-rules";

export type ContractMode = "avulso" | "pacote";
export type PackageSlot = { date: string; time: string; location_id: string };
export type SlotContext = {
  existing: TimedAppointment[];
  blocks: { starts_at: string; ends_at: string; location_id?: string | null }[];
  rules: AvailabilityWindow[];
  modality: string;
  durationMinutes: number;
  now?: Date;
  timeZone?: string;
};

/** Weekly suggestion: same weekday, time and location for every session. */
export function weeklySlots(date: string, time: string, locationId: string, quantity: number): PackageSlot[] {
  return Array.from({ length: quantity }, (_, i) => ({ date: addDays(date, 7 * i), time, location_id: locationId }));
}

export function slotTimes(slot: PackageSlot, minutes: number, timeZone = AGENDA_TIMEZONE) {
  const start = zonedDate(slot.date, slot.time, timeZone);
  return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + minutes * 60_000).toISOString() };
}

/** Why one session cannot be booked (checks agenda, other sessions of the same package, blocks and availability), or null. */
export function slotIssue(slots: PackageSlot[], index: number, ctx: SlotContext): string | null {
  const slot = slots[index];
  if (!slot?.date || !slot.time) return "Informe data e horário.";
  const times = slotTimes(slot, ctx.durationMinutes, ctx.timeZone);
  if (Date.parse(times.starts_at) < (ctx.now ?? new Date()).getTime()) return "Este horário já passou.";
  if (ctx.existing.some((item) => item.status !== "cancelado" && overlaps(times.starts_at, times.ends_at, item.starts_at, item.ends_at))) return "Já existe um atendimento neste horário.";
  const sibling = slots.findIndex((other, i) => i !== index && other.date && other.time && (() => { const o = slotTimes(other, ctx.durationMinutes, ctx.timeZone); return overlaps(times.starts_at, times.ends_at, o.starts_at, o.ends_at); })());
  if (sibling >= 0) return `Coincide com a sessão ${sibling + 1} deste pacote.`;
  if (ctx.blocks.some((block) => (!block.location_id || block.location_id === slot.location_id) && overlaps(times.starts_at, times.ends_at, block.starts_at, block.ends_at))) return "Horário bloqueado na agenda.";
  if (!fitsAvailability({ id: "new", status: "agendado", ...times, location_id: slot.location_id || null, room_id: null, modality: ctx.modality }, ctx.rules)) return "Fora da disponibilidade configurada.";
  return null;
}

function shiftTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total < 6 * 60 || total > 22 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Validated alternatives: same day nearby hours, then same hour on nearby days, then the following weeks. */
export function suggestAlternatives(slots: PackageSlot[], index: number, ctx: SlotContext, limit = 3): PackageSlot[] {
  const base = slots[index];
  const candidates: PackageSlot[] = [];
  for (const delta of [60, -60, 120, -120, 30, -30, 180, -180]) { const time = shiftTime(base.time, delta); if (time) candidates.push({ ...base, time }); }
  for (const days of [1, -1, 2, -2, 3, -3]) candidates.push({ ...base, date: addDays(base.date, days) });
  for (const days of [7, 14]) candidates.push({ ...base, date: addDays(base.date, days) });
  const result: PackageSlot[] = [];
  for (const candidate of candidates) {
    const trial = slots.map((slot, i) => (i === index ? candidate : slot));
    if (!slotIssue(trial, index, ctx)) result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}
