import { useEffect, useState, type FormEvent } from "react";
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
  type AppointmentModality,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/domain";
import {
  useLocations,
  usePatients,
  useSaveAppointment,
  usePackages,
  useAppointmentTypes,
  useServicePrices,
  useRooms,
  type AppointmentWithRefs,
} from "@/lib/data";
import { centsToReais, modalityMatches } from "@/lib/basic-registrations";
import { AGENDA_TIMEZONE, localParts, zonedDate } from "@/lib/agenda-rules";

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultPatientId,
  defaultTime,
  timeZone = AGENDA_TIMEZONE,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentWithRefs | undefined;
  defaultDate?: Date | undefined;
  defaultPatientId?: string | undefined;
  defaultTime?: string;
  timeZone?: string;
}) {
  const { data: patients } = usePatients(undefined, open);
  const { data: locations } = useLocations(open);
  const saveAppointment = useSaveAppointment();
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const { data: services } = useAppointmentTypes(open);

  const [values, setValues] = useState({
    patient_id: "",
    location_id: "",
    room_id: "none",
    date: toDateInput(new Date()),
    start: "09:00",
    end: "10:00",
    type: "atendimento_clinico" as AppointmentType,
    appointment_type_id: "",
    service_price_id: "none",
    modality: "presencial" as AppointmentModality,
    status: "agendado" as AppointmentStatus,
    notes: "",
    package_id: "none",
  });
  const { data: servicePrices } = useServicePrices(true, values.appointment_type_id || undefined, open && Boolean(values.appointment_type_id));
  const { data: rooms } = useRooms(values.location_id || undefined, open && Boolean(values.location_id));
  const { data: patientPackages } = usePackages(values.patient_id || undefined, open && Boolean(values.patient_id));
  const completedAppointment = appointment?.status === "realizado";

  useEffect(() => {
    if (!open) return;
    setPatientSearch("");
    setCancellationReason(appointment?.cancellation_reason ?? "");
    if (appointment) {
      const start = localParts(appointment.starts_at, timeZone);
      const end = localParts(appointment.ends_at, timeZone);
      setValues({
        patient_id: appointment.patient_id ?? "",
        location_id: appointment.location_id ?? "",
        room_id: appointment.room_id ?? "none",
        date: start.date,
        start: start.time,
        end: end.time,
        type: appointment.type,
        appointment_type_id: appointment.appointment_type_id ?? "",
        service_price_id: appointment.service_price_id ?? "none",
        modality: appointment.modality,
        status: appointment.status,
        notes: appointment.notes ?? "",
        package_id: appointment.package_id ?? "none",
      });
      return;
    }
    const base = defaultDate ?? new Date();
    setValues((current) => ({
      ...current,
      patient_id: defaultPatientId ?? "",
      location_id: "",
      room_id: "none",
      date: toDateInput(base),
      start: defaultTime ?? "09:00",
      end: endTimeFor(toDateInput(base), defaultTime ?? "09:00", DEFAULT_APPOINTMENT_MINUTES, timeZone),
      type: "atendimento_clinico",
      appointment_type_id: services?.[0]?.id ?? "",
      service_price_id: "none",
      modality: "presencial",
      status: "agendado",
      notes: "",
      package_id: "none",
    }));
  }, [open, appointment, defaultDate, defaultPatientId, defaultTime, timeZone]);

  const currentMinutes = Math.round((zonedDate(values.date, values.end, timeZone).getTime() - zonedDate(values.date, values.start, timeZone).getTime()) / 60_000);

  function selectService(serviceId: string) {
    const service = services?.find((item) => item.id === serviceId);
    const start = zonedDate(values.date, values.start, timeZone);
    const end = new Date(start.getTime() + (service?.default_duration_minutes ?? DEFAULT_APPOINTMENT_MINUTES) * 60_000);
    setValues({ ...values, appointment_type_id: serviceId, service_price_id: "none", end: localParts(end, timeZone).time });
  }

  function selectPrice(priceId: string) {
    const price = servicePrices?.find((item) => item.id === priceId);
    if (!price) return setValues({ ...values, service_price_id: priceId });
    const start = zonedDate(values.date, values.start, timeZone);
    const end = new Date(start.getTime() + price.duration_minutes * 60_000);
    setValues({ ...values, service_price_id: priceId, end: localParts(end, timeZone).time });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const startsAt = zonedDate(values.date, values.start, timeZone);
      const endsAt = zonedDate(values.date, values.end, timeZone);
      if (endsAt <= startsAt) {
        toast.error("O horário final deve ser depois do inicial.");
        return;
      }
      await saveAppointment.mutateAsync({
        ...(appointment ? { id: appointment.id } : {}),
        patient_id: values.patient_id || null,
        location_id: values.location_id || null,
        room_id: values.room_id === "none" ? null : values.room_id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        type: values.type,
        appointment_type_id: values.appointment_type_id || null,
        service_price_id: values.service_price_id === "none" ? null : values.service_price_id,
        modality: values.modality,
        status: values.status,
        notes: values.notes || null,
        cancellation_reason: values.status === "cancelado" ? cancellationReason.trim() : null,
        package_id: values.package_id === "none" ? null : values.package_id,
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
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setPatientDialogOpen(true)}
                >
                  + Novo paciente
                </Button>
              </div>
              <Input aria-label="Buscar paciente" placeholder="Buscar paciente" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} />
              <Select
                value={values.patient_id}
                onValueChange={(value) => setValues({ ...values, patient_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).filter((patient) => !patientSearch || patient.id === values.patient_id || patient.full_name.toLocaleLowerCase().includes(patientSearch.toLocaleLowerCase())).map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name}{patient.birth_date ? ` · ${patient.birth_date.split("-").reverse().join("/")}` : ""}
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
                  disabled={completedAppointment}
                  required
                  value={values.date}
                  onChange={(event) => setValues({ ...values, date: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="time"
                  disabled={completedAppointment}
                  required
                  value={values.start}
                  onChange={(event) => setValues({ ...values, start: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="time"
                  disabled={completedAppointment}
                  required
                  value={values.end}
                  onChange={(event) => setValues({ ...values, end: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5"><Label>Duração</Label><Select disabled={completedAppointment} value={String(currentMinutes)} onValueChange={(minutes) => setValues({ ...values, end: endTimeFor(values.date, values.start, Number(minutes), timeZone) })}><SelectTrigger aria-label="Duração"><SelectValue placeholder="Personalizada" /></SelectTrigger><SelectContent>{[...new Set([...DURATION_OPTIONS, ...(currentMinutes > 0 ? [currentMinutes] : [])])].sort((a, b) => a - b).map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} min</SelectItem>)}</SelectContent></Select></div>

            <div className="space-y-1.5">
              <Label>Local de atendimento</Label>
              <Select
                value={values.location_id}
                onValueChange={(value) => setValues({ ...values, location_id: value, room_id: "none" })}
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

            {values.location_id ? <div className="space-y-1.5"><Label>Sala</Label><Select value={values.room_id} onValueChange={(room_id) => setValues({ ...values, room_id })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem sala vinculada</SelectItem>{(rooms ?? []).filter((room) => room.is_active || room.id === values.room_id).map((room) => <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>)}</SelectContent></Select></div> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Serviço / atendimento</Label>
                <Select
                  value={values.appointment_type_id}
                  onValueChange={selectService}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {(services ?? []).map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} · {service.default_duration_minutes} min
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

            {values.appointment_type_id ? <div className="space-y-1.5"><Label>Valor sugerido (opcional)</Label><Select value={values.service_price_id} onValueChange={selectPrice}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem valor vinculado</SelectItem>{(servicePrices ?? []).filter((price) => price.billing_type === "avulso" && modalityMatches(price.modality, values.modality)).map((price) => <SelectItem key={price.id} value={price.id}>{price.duration_minutes} min · {price.modality === "todas" ? "Todas as modalidades" : price.modality} · {centsToReais(price.price_cents)}</SelectItem>)}</SelectContent></Select></div> : null}

            {values.patient_id ? (
              <div className="space-y-1.5">
                <Label>Pacote de sessões (opcional)</Label>
                <Select
                  disabled={completedAppointment}
                  value={values.package_id}
                  onValueChange={(package_id) => setValues({ ...values, package_id })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem pacote</SelectItem>
                    {(patientPackages ?? [])
                      .filter((item) => item.lifecycle_status === "ativo")
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.appointment_type?.name ?? "Pacote"} · {item.quantity} sessões
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {completedAppointment ? (
                  <p className="text-xs text-muted-foreground">
                    O vínculo do pacote não pode ser alterado após a conclusão do atendimento.
                  </p>
                ) : null}
              </div>
            ) : null}

            {appointment ? (
              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Select
                  disabled={completedAppointment}
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

            {values.status === "cancelado" ? <div className="space-y-1.5"><Label htmlFor="appointment-cancellation">Motivo do cancelamento</Label><Input id="appointment-cancellation" required minLength={3} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} /></div> : null}
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
