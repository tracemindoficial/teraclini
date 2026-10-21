import { describe, expect, it } from "vitest";
import { slotIssue, slotTimes, suggestAlternatives, weeklySlots } from "./package-scheduling";

const now = new Date("2026-10-01T12:00:00Z");
const ctx = { existing: [], blocks: [], rules: [], modality: "presencial", durationMinutes: 60, now };

describe("pacote de 4 sessões", () => {
  it("sugere quatro datas semanais", () => {
    expect(weeklySlots("2026-11-02", "09:00", "loc", 4).map((s) => s.date)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]);
  });
  it("cada sessão dura 60 minutos", () => {
    const t = slotTimes({ date: "2026-11-02", time: "09:00", location_id: "" }, 60);
    expect((Date.parse(t.ends_at) - Date.parse(t.starts_at)) / 60000).toBe(60);
  });
  it("detecta conflito na terceira sessão", () => {
    const slots = weeklySlots("2026-11-02", "09:00", "", 4);
    const busy = { id: "x", status: "agendado", ...slotTimes(slots[2], 60) };
    const c = { ...ctx, existing: [busy] };
    expect(slots.map((_, i) => slotIssue(slots, i, c))).toEqual([null, null, "Já existe um atendimento neste horário.", null]);
  });
  it("ignora atendimentos cancelados", () => {
    const slots = weeklySlots("2026-11-02", "09:00", "", 1);
    expect(slotIssue(slots, 0, { ...ctx, existing: [{ id: "x", status: "cancelado", ...slotTimes(slots[0], 60) }] })).toBeNull();
  });
  it("sugestões são livres de conflito", () => {
    const slots = weeklySlots("2026-11-02", "09:00", "", 4);
    const c = { ...ctx, existing: [{ id: "x", status: "agendado", ...slotTimes(slots[1], 60) }] };
    const alts = suggestAlternatives(slots, 1, c);
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expect(slotIssue(slots.map((s, i) => (i === 1 ? alt : s)), 1, c)).toBeNull();
  });
  it("recusa duas sessões no mesmo horário", () => {
    const slots = [{ date: "2026-11-02", time: "09:00", location_id: "" }, { date: "2026-11-02", time: "09:30", location_id: "" }];
    expect(slotIssue(slots, 1, ctx)).toBe("Coincide com a sessão 1 deste pacote.");
  });
});
