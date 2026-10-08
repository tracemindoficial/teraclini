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
import { BLOCK_CATEGORIES, toLocalInputValue } from "@/lib/domain";
import { useLocations, useRooms, useSaveScheduleBlock, type ScheduleBlock } from "@/lib/data";

export function ScheduleBlockDialog({
  open,
  onOpenChange,
  block,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: ScheduleBlock;
}) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("compromisso");
  const [start, setStart] = useState(toLocalInputValue(new Date()));
  const [end, setEnd] = useState(toLocalInputValue(new Date(Date.now() + 3600000)));
  const [locationId, setLocationId] = useState("todos");
  const [roomId, setRoomId] = useState("todas");
  const { data: locations } = useLocations(open);
  const { data: rooms } = useRooms(locationId === "todos" ? undefined : locationId, open);
  const save = useSaveScheduleBlock();
  useEffect(() => {
    if (open) {
      setReason(block?.reason ?? "");
      setCategory(block?.category ?? "compromisso");
      setStart(
        block ? toLocalInputValue(new Date(block.starts_at)) : toLocalInputValue(new Date()),
      );
      setEnd(
        block
          ? toLocalInputValue(new Date(block.ends_at))
          : toLocalInputValue(new Date(Date.now() + 3600000)),
      );
      setLocationId(block?.location_id ?? "todos");
      setRoomId(block?.room_id ?? "todas");
    }
  }, [open, block]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        ...(block ? { id: block.id } : {}),
        reason: reason.trim(),
        category,
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        location_id: locationId === "todos" ? null : locationId,
        room_id: roomId === "todas" ? null : roomId,
      });
      toast.success("Bloqueio salvo.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Motivo *</Label>
            <Input
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                required
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input
                required
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
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
                  <SelectItem value="todos">Agenda inteira</SelectItem>
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
