import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppointmentTypes, usePatients, useSavePackage, useServicePrices, type CarePackageWithRefs } from "@/lib/data";
import { centsToReais } from "@/lib/basic-registrations";
import { toDateInput } from "@/lib/domain";

const PERIODICITIES = [
  ["sem_periodicidade", "Sem periodicidade"],
  ["semanal", "Semanal"],
  ["quinzenal", "Quinzenal"],
  ["mensal", "Mensal"],
  ["personalizada", "Personalizada"],
] as const;

export function PackageDialog({
  open,
  onOpenChange,
  item,
  renewFrom,
  defaultPatientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CarePackageWithRefs | undefined;
  renewFrom?: CarePackageWithRefs | undefined;
  defaultPatientId?: string | undefined;
  onSaved?: ((id: string) => void) | undefined;
}) {
  const { data: patients } = usePatients();
  const { data: types } = useAppointmentTypes();
  const save = useSavePackage();
  const [values, setValues] = useState(defaultValues());
  const { data: prices } = useServicePrices(true, values.typeId === "none" ? undefined : values.typeId);

  useEffect(() => {
    if (!open) return;
    const source = item ?? renewFrom;
    setValues(
      source
        ? {
            patientId: source.patient_id,
            typeId: source.appointment_type_id ?? "none",
            quantity: String(source.quantity),
            totalValue: source.total_value === null ? "" : String(source.total_value),
            priceId: source.service_price_id ?? "none",
            startDate: item ? source.start_date : toDateInput(new Date()),
            endDate: item ? (source.end_date ?? "") : "",
            periodicity: source.periodicity,
            threshold: String(Math.min(source.renewal_alert_threshold, source.quantity)),
            notes: source.notes ?? "",
          }
        : { ...defaultValues(), patientId: defaultPatientId ?? "" },
    );
  }, [open, item, renewFrom, defaultPatientId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const quantity = Number(values.quantity);
    const threshold = Number(values.threshold);
    const totalValue = values.totalValue === "" ? null : Number(values.totalValue.replace(",", "."));
    if (!values.patientId || !Number.isInteger(quantity) || quantity < 1) {
      toast.error("Selecione o paciente e informe uma quantidade válida.");
      return;
    }
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > quantity) {
      toast.error("O alerta deve estar entre zero e a quantidade de sessões.");
      return;
    }
    if (totalValue !== null && (!Number.isFinite(totalValue) || totalValue < 0)) {
      toast.error("Informe um valor válido ou deixe o campo vazio.");
      return;
    }
    try {
      const saved = await save.mutateAsync({
        ...(item ? { id: item.id } : {}),
        patient_id: values.patientId,
        appointment_type_id: values.typeId === "none" ? null : values.typeId,
        service_price_id: values.priceId === "none" ? null : values.priceId,
        quantity,
        total_value: totalValue,
        value_per_session: totalValue === null ? null : Number((totalValue / quantity).toFixed(2)),
        start_date: values.startDate,
        end_date: values.endDate || null,
        periodicity: values.periodicity,
        renewal_alert_threshold: threshold,
        parent_package_id: renewFrom?.id ?? item?.parent_package_id ?? null,
        lifecycle_status: item?.lifecycle_status ?? "ativo",
        notes: values.notes.trim() || null,
      });
      toast.success(item ? "Pacote atualizado." : renewFrom ? "Pacote renovado." : "Pacote criado.");
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o pacote.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{item ? "Editar pacote" : renewFrom ? "Renovar pacote" : "Novo pacote"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Paciente"><Select value={values.patientId} onValueChange={(patientId) => setValues({ ...values, patientId })} disabled={Boolean(item || renewFrom)}><SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger><SelectContent>{(patients ?? []).map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.full_name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Serviço/atendimento"><Select value={values.typeId} onValueChange={(typeId) => setValues({ ...values, typeId })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem serviço definido</SelectItem>{(types ?? []).map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select></Field>
          {values.typeId !== "none" ? <Field label="Valor de pacote cadastrado (opcional)"><Select value={values.priceId} onValueChange={(priceId) => { const price = prices?.find((item) => item.id === priceId); setValues({ ...values, priceId, ...(price ? { quantity: String(price.package_quantity), totalValue: String(price.price_cents / 100) } : {}) }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Informar neste pacote</SelectItem>{(prices ?? []).filter((price) => price.billing_type === "pacote").map((price) => <SelectItem key={price.id} value={price.id}>{price.package_quantity} sessões · {centsToReais(price.price_cents)}</SelectItem>)}</SelectContent></Select></Field> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade de sessões"><Input type="number" min={1} step={1} required value={values.quantity} onChange={(event) => setValues({ ...values, quantity: event.target.value })} /></Field>
            <Field label="Valor total (opcional)"><Input inputMode="decimal" placeholder="Valor a definir" value={values.totalValue} onChange={(event) => setValues({ ...values, totalValue: event.target.value })} /></Field>
            <Field label="Data de início"><Input type="date" required value={values.startDate} onChange={(event) => setValues({ ...values, startDate: event.target.value })} /></Field>
            <Field label="Data de término (opcional)"><Input type="date" min={values.startDate} value={values.endDate} onChange={(event) => setValues({ ...values, endDate: event.target.value })} /></Field>
            <Field label="Periodicidade"><Select value={values.periodicity} onValueChange={(periodicity) => setValues({ ...values, periodicity: periodicity as typeof values.periodicity })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIODICITIES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Alertar quando restarem"><Input type="number" min={0} max={values.quantity || undefined} step={1} required value={values.threshold} onChange={(event) => setValues({ ...values, threshold: event.target.value })} /></Field>
          </div>
          <Field label="Observação (opcional)"><Textarea rows={3} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>Salvar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultValues() {
  return { patientId: "", typeId: "none", priceId: "none", quantity: "4", totalValue: "", startDate: toDateInput(new Date()), endDate: "", periodicity: "sem_periodicidade" as "sem_periodicidade" | "semanal" | "quinzenal" | "mensal" | "personalizada", threshold: "2", notes: "" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}