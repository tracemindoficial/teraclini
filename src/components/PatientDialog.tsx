import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGE_GROUPS, PATIENT_STATUSES, type AgeGroup, type PatientStatus } from "@/lib/domain";
import { useSavePatient, useSaveGuardian, type Patient } from "@/lib/data";
import { cn } from "@/lib/utils";

const EMPTY = {
  full_name: "",
  age_group: "adulto" as AgeGroup,
  birth_date: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  status: "ativo" as PatientStatus,
  notes: "",
};

export function PatientDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | undefined;
  onSaved?: ((patient: Patient) => void) | undefined;
}) {
  const [values, setValues] = useState(EMPTY);
  const [guardian, setGuardian] = useState({ full_name: "", relationship: "", phone: "", email: "" });
  const savePatient = useSavePatient();
  const saveGuardian = useSaveGuardian();

  useEffect(() => {
    if (!open) return;
    setValues(
      patient
        ? {
            full_name: patient.full_name,
            age_group: patient.age_group,
            birth_date: patient.birth_date ?? "",
            gender: patient.gender ?? "",
            phone: patient.phone ?? "",
            email: patient.email ?? "",
            address: patient.address ?? "",
            status: patient.status,
            notes: patient.notes ?? "",
          }
        : EMPTY,
    );
    setGuardian({ full_name: "", relationship: "", phone: "", email: "" });
  }, [open, patient]);

  const needsGuardian = values.age_group !== "adulto";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = await savePatient.mutateAsync({
        ...(patient ? { id: patient.id } : {}),
        full_name: values.full_name.trim(),
        age_group: values.age_group,
        birth_date: values.birth_date || null,
        gender: values.gender || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        status: values.status,
        notes: values.notes || null,
      });

      if (needsGuardian && guardian.full_name.trim()) {
        await saveGuardian.mutateAsync({
          patient_id: saved.id,
          full_name: guardian.full_name.trim(),
          relationship: guardian.relationship || null,
          phone: guardian.phone || null,
          email: guardian.email || null,
        });
      }

      toast.success(patient ? "Paciente atualizado." : "Paciente cadastrado.");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          <DialogDescription>Quem será atendido?</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {AGE_GROUPS.map((group) => (
              <button
                key={group.value}
                type="button"
                onClick={() => setValues({ ...values, age_group: group.value })}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  values.age_group === group.value
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {group.label}
              </button>
            ))}
          </div>

          <FormField label="Nome completo" required>
            <Input
              required
              value={values.full_name}
              onChange={(event) => setValues({ ...values, full_name: event.target.value })}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Data de nascimento">
              <Input
                type="date"
                value={values.birth_date}
                onChange={(event) => setValues({ ...values, birth_date: event.target.value })}
              />
            </FormField>
            <FormField label="Sexo">
              <Input
                value={values.gender}
                onChange={(event) => setValues({ ...values, gender: event.target.value })}
              />
            </FormField>
            <FormField label="Telefone">
              <Input
                value={values.phone}
                onChange={(event) => setValues({ ...values, phone: event.target.value })}
              />
            </FormField>
            <FormField label="E-mail">
              <Input
                type="email"
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Endereço">
            <Input
              value={values.address}
              onChange={(event) => setValues({ ...values, address: event.target.value })}
            />
          </FormField>

          <FormField label="Situação">
            <Select
              value={values.status}
              onValueChange={(value) => setValues({ ...values, status: value as PatientStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {needsGuardian && !patient ? (
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Responsável</p>
              <p className="mb-3 text-xs text-muted-foreground">Opcional agora, editável depois.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Nome"
                  value={guardian.full_name}
                  onChange={(event) => setGuardian({ ...guardian, full_name: event.target.value })}
                />
                <Input
                  placeholder="Parentesco"
                  value={guardian.relationship}
                  onChange={(event) => setGuardian({ ...guardian, relationship: event.target.value })}
                />
                <Input
                  placeholder="Telefone"
                  value={guardian.phone}
                  onChange={(event) => setGuardian({ ...guardian, phone: event.target.value })}
                />
                <Input
                  placeholder="E-mail"
                  value={guardian.email}
                  onChange={(event) => setGuardian({ ...guardian, email: event.target.value })}
                />
              </div>
            </div>
          ) : null}

          <FormField label="Observações">
            <Textarea
              rows={3}
              value={values.notes}
              onChange={(event) => setValues({ ...values, notes: event.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savePatient.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
