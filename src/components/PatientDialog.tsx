import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { CompletePatientFields } from "@/components/patients/CompletePatientFields";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PATIENT_STATUSES } from "@/lib/domain";
import { useSaveCompletePatient, type Patient } from "@/lib/data";
import { EMPTY_REGISTRATION, professionalPatientSchema, type ProfessionalPatientPayload } from "@/lib/patient-registration-schema";

const EMPTY = {
  ...EMPTY_REGISTRATION,
  notes: "",
  status: "ativo" as const,
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
  const form = useForm<ProfessionalPatientPayload>({
    resolver: zodResolver(professionalPatientSchema),
    defaultValues: EMPTY,
  });
  const savePatient = useSaveCompletePatient();

  useEffect(() => {
    if (!open) return;
    form.reset(patient ? {
      ...EMPTY,
      full_name: patient.full_name,
      age_group: patient.age_group,
      birth_date: patient.birth_date ?? "",
      gender: patient.gender ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      cpf: patient.cpf ?? "",
      postal_code: patient.postal_code ?? "",
      street: patient.address ?? "",
      address_number: patient.address_number ?? "",
      address_complement: patient.address_complement ?? "",
      neighborhood: patient.neighborhood ?? "",
      city: patient.city ?? "",
      state: patient.state ?? "",
      marital_status: patient.marital_status ?? "",
      education: patient.education ?? "",
      occupation: patient.occupation ?? "",
      status: patient.status,
      notes: patient.notes ?? "",
    } : EMPTY);
  }, [form, open, patient]);

  const handleSubmit = form.handleSubmit(async (payload) => {
    try {
      const saved = await savePatient.mutateAsync(patient ? { patientId: patient.id, payload } : { payload });

      toast.success(patient ? "Paciente atualizado." : "Paciente cadastrado.");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cadastro completo.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          <DialogDescription>Quem será atendido?</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <CompletePatientFields />
          <FormField label="Situação">
            <Select
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as ProfessionalPatientPayload["status"])}
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

          <FormField label="Observações">
            <Textarea
              rows={3}
              {...form.register("notes")}
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
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
