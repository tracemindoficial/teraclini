import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocations, useRooms, useSaveAvailabilityRule, type AvailabilityRule } from "@/lib/data";
import { WEEKDAYS } from "@/lib/domain";

export function AvailabilityDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AvailabilityRule;
}) {
  const [weekday, setWeekday] = useState("1");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [locationId, setLocationId] = useState("todos");
  const [roomId, setRoomId] = useState("todas");
  const { data: locations } = useLocations();
  const { data: rooms } = useRooms(locationId === "todos" ? undefined : locationId);
  const save = useSaveAvailabilityRule();
  useEffect(() => {
    if (open) {
      setWeekday(String(rule?.weekday ?? 1));
      setStart(rule?.start_time.slice(0, 5) ?? "08:00");
      setEnd(rule?.end_time.slice(0, 5) ?? "18:00");
      setLocationId(rule?.location_id ?? "todos");
      setRoomId(rule?.room_id ?? "todas");
    }
  }, [open, rule]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...(rule ? { id: rule.id } : {}),
        weekday: Number(weekday),
        start_time: start,
        end_time: end,
        location_id: locationId === "todos" ? null : locationId,
        room_id: roomId === "todas" ? null : roomId,
      });
      toast.success("Disponibilidade salva.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Horário disponível</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Dia</Label>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day, index) => (
                  <SelectItem key={day} value={String(index)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                required
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input required type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Select
                value={locationId}
                onValueChange={(v) => {
                  setLocationId(v);
                  setRoomId("todas");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os locais</SelectItem>
                  {locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sala</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as salas</SelectItem>
                  {rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
