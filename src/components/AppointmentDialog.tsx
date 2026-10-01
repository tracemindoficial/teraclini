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
import { PatientDialog } from "@/components/PatientDialog";
import {
  APPOINTMENT_MODALITIES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  toDateInput,
  toTimeInput,
  type AppointmentModality,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/domain";
import {
  useLocations,
  usePatients,
  useSaveAppointment,
  type AppointmentWithRefs,
} from "@/lib/data";

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultPatientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentWithRefs | undefined;
  defaultDate?: Date | undefined;
  defaultPatientId?: string | undefined;
}) {
  const { data: patients } = usePatients();
  const { data: locations } = useLocations();
  const saveAppointment = useSaveAppointment();
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);

  const [values, setValues] = useState({
    patient_id: "",
    location_id: "",
    date: toDateInput(new Date()),
    start: "09:00",
    end: "10:00",
    type: "atendimento_clinico" as AppointmentType,
    modality: "presencial" as AppointmentModality,
    status: "agendado" as AppointmentStatus,
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      const start = new Date(appointment.starts_at);
      const end = new Date(appointment.ends_at);
      setValues({
        patient_id: appointment.patient_id ?? "",
        location_id: appointment.location_id ?? "",
        date: toDateInput(start),
        start: toTimeInput(start),
        end: toTimeInput(end),
        type: appointment.type,
        modality: appointment.modality,
        status: appointment.status,
        notes: appointment.notes ?? "",
      });
      return;
    }
    const base = defaultDate ?? new Date();
    setValues((current) => ({
      ...current,
      patient_id: defaultPatientId ?? "",
      location_id: "",
      date: toDateInput(base),
      start: "09:00",
      end: "10:00",
      type: "atendimento_clinico",
      modality: "presencial",
      status: "agendado",
      notes: "",
    }));
  }, [open, appointment, defaultDate, defaultPatientId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const startsAt = new Date(`${values.date}T${values.start}`);
      const endsAt = new Date(`${values.date}T${values.end}`);
      if (endsAt <= startsAt) {
        toast.error("O horário final deve ser depois do inicial.");
        return;
      }
      await saveAppointment.mutateAsync({
        ...(appointment ? { id: appointment.id } : {}),
        patient_id: values.patient_id || null,
        location_id: values.location_id || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        type: values.type,
        modality: values.modality,
        status: values.status,
        notes: values.notes || null,
      });
      toast.success(appointment ? "Agendamento atualizado." : "Atendimento agendado.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível agendar.");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{appointment ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Paciente</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setPatientDialogOpen(true)}
                >
                  + Novo paciente
                </button>
              </div>
              <Select
                value={values.patient_id}
                onValueChange={(value) => setValues({ ...values, patient_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  required
                  value={values.date}
                  onChange={(event) => setValues({ ...values, date: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="time"
                  required
                  value={values.start}
                  onChange={(event) => setValues({ ...values, start: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="time"
                  required
                  value={values.end}
                  onChange={(event) => setValues({ ...values, end: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Local de atendimento</Label>
              <Select
                value={values.location_id}
                onValueChange={(value) => setValues({ ...values, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar local" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de atendimento</Label>
                <Select
                  value={values.type}
                  onValueChange={(value) => setValues({ ...values, type: value as AppointmentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Select
                  value={values.modality}
                  onValueChange={(value) =>
                    setValues({ ...values, modality: value as AppointmentModality })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_MODALITIES.map((modality) => (
                      <SelectItem key={modality.value} value={modality.value}>
                        {modality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {appointment ? (
              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) =>
                    setValues({ ...values, status: value as AppointmentStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={values.notes}
                onChange={(event) => setValues({ ...values, notes: event.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveAppointment.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PatientDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        onSaved={(patient) => setValues((current) => ({ ...current, patient_id: patient.id }))}
      />
    </>
  );
}
