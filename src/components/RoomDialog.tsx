import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveRoom, type Room } from "@/lib/data";

export function RoomDialog({
  open,
  onOpenChange,
  locationId,
  room,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  room?: Room;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const save = useSaveRoom();
  useEffect(() => {
    if (open) {
      setName(room?.name ?? "");
      setNotes(room?.notes ?? "");
    }
  }, [open, room]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...(room ? { id: room.id } : {}),
        location_id: locationId,
        name: name.trim(),
        notes: notes.trim() || null,
      });
      toast.success(room ? "Sala atualizada." : "Sala cadastrada.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a sala.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{room ? "Editar sala" : "Nova sala"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da sala *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Sala 3"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
