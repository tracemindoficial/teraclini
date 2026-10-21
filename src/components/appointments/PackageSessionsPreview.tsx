import { useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments, useAvailabilityRules, useScheduleBlocks, type Location } from "@/lib/data";
import { addDays, endTimeFor, zonedDate, type AvailabilityWindow } from "@/lib/agenda-rules";
import { slotIssue, suggestAlternatives, type PackageSlot } from "@/lib/package-scheduling";

const br = (date: string) => date.split("-").reverse().join("/");

export function PackageSessionsPreview({ slots, onChange, durationMinutes, modality, locations, onIssues }: {
  slots: PackageSlot[];
  onChange: (slots: PackageSlot[]) => void;
  durationMinutes: number;
  modality: string;
  locations: Location[];
  onIssues: (count: number) => void;
}) {
  const dates = slots.map((s) => s.date).filter(Boolean).sort();
  const first = dates[0] ?? slots[0]?.date ?? "";
  const last = dates[dates.length - 1] ?? first;
  const from = first ? zonedDate(addDays(first, -4), "00:00").toISOString() : "";
  const to = last ? zonedDate(addDays(last, 18), "00:00").toISOString() : "";
  const { data: existing = [] } = useAppointments({ from, to });
  const { data: blocks = [] } = useScheduleBlocks(from, to);
  const { data: rules = [] } = useAvailabilityRules();
  const ctx = { existing, blocks, rules: rules as unknown as AvailabilityWindow[], modality, durationMinutes };
  const issues = useMemo(() => slots.map((_, i) => slotIssue(slots, i, ctx)), [slots, existing, blocks, rules, modality, durationMinutes]);
  const count = issues.filter(Boolean).length;
  useEffect(() => onIssues(count), [count, onIssues]);
  const update = (i: number, patch: Partial<PackageSlot>) => onChange(slots.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  const firstIssue = issues.findIndex(Boolean);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Sessões do pacote</p>
      {firstIssue >= 0 ? (
        <p role="alert" className="flex gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Não foi possível reservar todas as sessões do pacote. A sessão {firstIssue + 1} de {slots.length} apresenta conflito de horário. Escolha outra data ou selecione uma das sugestões disponíveis.</p>
      ) : null}
      <ol className="space-y-3">
        {slots.map((slot, i) => {
          const issue = issues[i];
          const alternatives = issue ? suggestAlternatives(slots, i, ctx) : [];
          return (
            <li key={i} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Sessão {i + 1} de {slots.length}</span>
                {issue ? <span className="text-destructive">{issue}</span> : <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-3" />Disponível</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_6rem_auto_1fr] sm:items-center">
                <Input aria-label={`Data da sessão ${i + 1}`} type="date" value={slot.date} disabled={i === 0} onChange={(e) => update(i, { date: e.target.value })} />
                <Input aria-label={`Horário da sessão ${i + 1}`} type="time" value={slot.time} disabled={i === 0} onChange={(e) => update(i, { time: e.target.value })} />
                <span className="text-xs text-muted-foreground">até {slot.date && slot.time ? endTimeFor(slot.date, slot.time, durationMinutes) : "—"}</span>
                <Select value={slot.location_id || "none"} onValueChange={(v) => update(i, { location_id: v === "none" ? "" : v })}>
                  <SelectTrigger aria-label={`Local da sessão ${i + 1}`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem local</SelectItem>{locations.filter((l) => l.is_active || l.id === slot.location_id).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {issue && i === 0 ? <p className="text-xs text-muted-foreground">Altere a data ou o horário da primeira sessão nos campos acima.</p> : null}
              {issue ? (
                <div className="flex flex-wrap gap-2">
                  {alternatives.length ? alternatives.map((alt) => (
                    <Button key={`${alt.date}${alt.time}`} type="button" size="sm" variant="outline" onClick={() => update(i, { date: alt.date, time: alt.time })} disabled={i === 0}>Usar {br(alt.date)} {alt.time}</Button>
                  )) : <span className="text-xs text-muted-foreground">Sem sugestões próximas; escolha outra data manualmente.</span>}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
