import { describe, expect, it } from "vitest";
import { UNAVAILABLE_SLOT, OUTSIDE_AVAILABILITY, agendaRange, canMove, durationMinutes, hasConflict, localParts, moveIssue, movedTimes, overlaps, statusActions, zonedDate } from "./agenda-rules";

describe("weekly agenda rules", () => {
  for (const [end, minutes] of [["09:30", 30], ["10:00", 60], ["10:30", 90], ["11:00", 120]] as const) {
    it(`represents ${minutes} minutes proportionally`, () => expect(durationMinutes(`2026-10-05T09:00:00-03:00`, `2026-10-05T${end}:00-03:00`)).toBe(minutes));
  }
  for (const time of ["09:30", "14:30"]) it(`preserves ${time}`, () => expect(localParts(zonedDate("2026-10-05", time)).time).toBe(time));
  it("includes Saturday and Sunday in Monday-based week", () => {
    expect(agendaRange("2026-10-10", "semana").start).toBe("2026-10-05");
    expect(agendaRange("2026-10-11", "semana").end).toBe("2026-10-12");
  });
  it("allows consecutive 09–10 and 10–11", () => expect(overlaps("2026-10-05T09:00Z", "2026-10-05T10:00Z", "2026-10-05T10:00Z", "2026-10-05T11:00Z")).toBe(false));
  it("blocks 09–10 with 09:30–10:30", () => expect(overlaps("2026-10-05T09:00Z", "2026-10-05T10:00Z", "2026-10-05T09:30Z", "2026-10-05T10:30Z")).toBe(true));
  const appointment = { id: "a", starts_at: "2026-10-09T09:00:00-03:00", ends_at: "2026-10-09T10:30:00-03:00", status: "agendado" };
  it("preserves 90-minute duration when moved", () => expect(movedTimes(appointment, "2026-10-10T14:30:00-03:00").ends_at).toBe("2026-10-10T19:00:00.000Z"));
  it("never moves completed appointments", () => expect(canMove({ ...appointment, status: "realizado" }, new Date("2026-10-01"))).toBe(false));
  it("never moves historical appointments", () => expect(canMove(appointment, new Date("2026-10-12"))).toBe(false));
  it("ignores cancelled slots and own record in conflicts", () => expect(hasConflict(appointment, appointment.starts_at, appointment.ends_at, [appointment, { ...appointment, id: "b", status: "cancelado" }])).toBe(false));
  it("completed status offers no accidental cancellation or reopening", () => expect(statusActions("realizado")).toEqual([]));
  it("offers cancellation and missing attendance on scheduled events", () => expect(statusActions("agendado")).toContain("falta"));
  it("preserves Friday and Saturday local dates across UTC midnight", () => {
    expect(localParts("2026-10-10T01:30:00Z").date).toBe("2026-10-09");
    expect(localParts("2026-10-11T01:30:00Z").date).toBe("2026-10-10");
  });
});

describe("drag and drop move validation", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const appt = { id: "a", starts_at: "2026-10-09T12:00:00Z", ends_at: "2026-10-09T13:00:00Z", status: "agendado" };
  const other = { id: "b", starts_at: "2026-10-09T15:00:00Z", ends_at: "2026-10-09T16:00:00Z", status: "confirmado" };
  it("accepts a free slot", () => expect(moveIssue(appt, "2026-10-09T17:00:00Z", [appt, other], [], now)).toBeNull());
  it("rejects an occupied slot", () => expect(moveIssue(appt, "2026-10-09T15:30:00Z", [appt, other], [], now)).toBe(UNAVAILABLE_SLOT));
  it("rejects a blocked period", () => expect(moveIssue(appt, "2026-10-09T18:00:00Z", [appt], [{ starts_at: "2026-10-09T18:30:00Z", ends_at: "2026-10-09T20:00:00Z" }], now)).toBe(UNAVAILABLE_SLOT));
  it("rejects a past destination", () => expect(moveIssue(appt, "2026-09-30T12:00:00Z", [appt], [], now)).not.toBeNull());
  it("rejects completed appointments", () => expect(moveIssue({ ...appt, status: "realizado" }, "2026-10-09T17:00:00Z", [], [], now)).not.toBeNull());
});
describe("drag and drop availability", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  // Friday 2026-10-09, 09:00–10:00 São Paulo
  const appt = { id: "a", starts_at: "2026-10-09T12:00:00Z", ends_at: "2026-10-09T13:00:00Z", status: "agendado", location_id: null, room_id: null, modality: "online" };
  const friday = { weekday: 5, start_time: "08:00:00", end_time: "12:00:00", timezone: "America/Sao_Paulo", is_active: true, valid_from: null, valid_until: null, location_id: null, room_id: null, modality: null };
  it("accepts a destination inside the window", () => expect(moveIssue(appt, "2026-10-09T13:00:00Z", [appt], [], now, [friday])).toBeNull());
  it("rejects a destination ending after the window", () => expect(moveIssue(appt, "2026-10-09T14:30:00Z", [appt], [], now, [friday])).toBe(OUTSIDE_AVAILABILITY));
  it("rejects another weekday", () => expect(moveIssue(appt, "2026-10-08T12:00:00Z", [appt], [], now, [friday])).toBe(OUTSIDE_AVAILABILITY));
  it("allows anything when no window is active", () => expect(moveIssue(appt, "2026-10-08T22:00:00Z", [appt], [], now, [{ ...friday, is_active: false }])).toBeNull());
});

import { DEFAULT_APPOINTMENT_MINUTES, endTimeFor } from "./agenda-rules";
describe("duração padrão", () => {
  it("novos atendimentos começam com 60 minutos", () => expect(DEFAULT_APPOINTMENT_MINUTES).toBe(60));
  it("13h + 60 min termina às 14h", () => expect(endTimeFor("2026-10-21", "13:00", 60)).toBe("14:00"));
  it("14h + 90 min termina às 15h30", () => expect(endTimeFor("2026-10-21", "14:00", 90)).toBe("15:30"));
});
