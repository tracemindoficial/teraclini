import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATION_TYPES, type LocationType } from "@/lib/domain";
import { useSaveLocation, type Location } from "@/lib/data";

const EMPTY = {
  name: "",
  type: "clinica" as LocationType,
  address: "",
  city: "",
  state: "",
  contact: "",
  notes: "",
};

export function LocationDialog({
  open,
  onOpenChange,
  location,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location;
  onSaved?: (location: Location) => void;
}) {
  const [values, setValues] = useState(EMPTY);
  const saveLocation = useSaveLocation();

  useEffect(() => {
    if (!open) return;
    setValues(
      location
        ? {
            name: location.name,
            type: location.type,
            address: location.address ?? "",
            city: location.city ?? "",
            state: location.state ?? "",
            contact: location.contact ?? "",
            notes: location.notes ?? "",
          }
        : EMPTY,
    );
  }, [open, location]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = await saveLocation.mutateAsync({
        ...(location ? { id: location.id } : {}),
        name: values.name.trim(),
        type: values.type,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        contact: values.contact || null,
        notes: values.notes || null,
      });
      toast.success(location ? "Local atualizado." : "Local cadastrado.");
      onOpenChange(false);
      onSaved?.(saved as Location);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{location ? "Editar local" : "Novo local de atendimento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do local *</Label>
            <Input
              required
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={values.type}
              onValueChange={(value) => setValues({ ...values, type: value as LocationType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input
              value={values.address}
              onChange={(event) => setValues({ ...values, address: event.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={values.city}
                onChange={(event) => setValues({ ...values, city: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input
                value={values.state}
                onChange={(event) => setValues({ ...values, state: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contato</Label>
            <Input
              value={values.contact}
              onChange={(event) => setValues({ ...values, contact: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={values.notes}
              onChange={(event) => setValues({ ...values, notes: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveLocation.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
