import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, Check, CircleCheck, Clock, Pencil, Play, UserRound, UserRoundX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DetailRow } from "@/components/ui/detail-row";
import { useAppointmentEvents, usePackage, useUpdateAppointment, type AppointmentWithRefs } from "@/lib/data";
import { APPOINTMENT_MODALITIES, APPOINTMENT_STATUSES, APPOINTMENT_TYPES, labelOf } from "@/lib/domain";
import { canMove, durationMinutes, localParts, movedTimes, statusActions, zonedDate } from "@/lib/agenda-rules";
import type { AppointmentStatus } from "@/lib/domain";
import { packageUsage } from "@/lib/package-metrics";

const ACTIONS = { confirmado: { label: "Confirmar", icon: Check }, em_andamento: { label: "Iniciar", icon: Play }, realizado: { label: "Concluir", icon: CircleCheck }, falta: { label: "Registrar falta", icon: UserRoundX }, cancelado: { label: "Cancelar atendimento", icon: X } };

export function AppointmentQuickDetails({ appointment, onClose, onEdit, onMove, timeZone }: {
  appointment: AppointmentWithRefs;
  onClose: () => void;
  onEdit: () => void;
  onMove: (start: string) => Promise<void>;
  timeZone: string;
}) {
  const update = useUpdateAppointment();
  const { data: carePackage } = usePackage(appointment.package_id ?? "");
  const { data: events } = useAppointmentEvents(appointment.id);
  const [mode, setMode] = useState<"details" | "move" | "cancel">("details");
  const local = localParts(appointment.starts_at, timeZone);
  const [date, setDate] = useState(local.date);
  const [time, setTime] = useState(local.time);
  const [reason, setReason] = useState("");
  const [moving, setMoving] = useState(false);
  const usage = carePackage ? packageUsage(carePackage) : null;
  async function changeStatus(status: AppointmentStatus) {
    try {
      await update.mutateAsync({ id: appointment.id, status, ...(status === "cancelado" ? { cancellation_reason: reason.trim() } : {}), ...(status === "em_andamento" ? { started_at: new Date().toISOString() } : {}), ...(status === "realizado" ? { completed_at: new Date().toISOString() } : {}) });
      toast.success("Situação atualizada."); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{appointment.patient?.full_name ?? "Atendimento"}</DialogTitle></DialogHeader>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><Clock className="size-4" /><span>{local.date.split("-").reverse().join("/")} · {local.time}–{localParts(appointment.ends_at, timeZone).time}</span><span>{durationMinutes(appointment.starts_at, appointment.ends_at)} min</span></div>
    <dl className="space-y-2 text-sm"><DetailRow label="Serviço" value={appointment.service_name_snapshot ?? appointment.appointment_type?.name ?? labelOf(APPOINTMENT_TYPES, appointment.type)} /><DetailRow label="Situação" value={labelOf(APPOINTMENT_STATUSES, appointment.status)} /><DetailRow label="Modalidade" value={labelOf(APPOINTMENT_MODALITIES, appointment.modality)} /><DetailRow label="Local" value={appointment.modality === "online" ? "Online" : appointment.location?.name ?? "Não informado"} />{appointment.room ? <DetailRow label="Sala" value={appointment.room.name} /> : null}<DetailRow label="Valor" value={appointment.price_cents_snapshot !== null ? (appointment.price_cents_snapshot / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "A definir"} /></dl>
    {carePackage && usage ? <div className="border-l-2 border-secondary pl-3 text-sm"><p>{carePackage.service_name_snapshot ?? "Pacote"} · {usage.used} de {carePackage.quantity} sessões utilizadas</p><p className={usage.remaining <= carePackage.renewal_alert_threshold ? "font-medium text-warning-foreground" : "text-muted-foreground"}>Restam {usage.remaining} sessões</p></div> : null}
    {appointment.notes ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{appointment.notes}</p> : null}
    {mode === "move" ? <form className="space-y-3 border-t pt-4" onSubmit={async (event) => { event.preventDefault(); setMoving(true); try { await onMove(zonedDate(date, time, timeZone).toISOString()); onClose(); } catch {} finally { setMoving(false); } }}><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="move-date">Data</Label><Input id="move-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div><div><Label htmlFor="move-time">Início</Label><Input id="move-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></div></div><p className="text-xs text-muted-foreground">Fim: {localParts(movedTimes(appointment, zonedDate(date, time, timeZone).toISOString()).ends_at, timeZone).time}</p><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setMode("details")}>Voltar</Button><Button type="submit" disabled={moving}>Salvar horário</Button></div></form> : mode === "cancel" ? <form className="space-y-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); changeStatus("cancelado"); }}><Label htmlFor="cancel-reason">Motivo do cancelamento</Label><Input id="cancel-reason" required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setMode("details")}>Voltar</Button><Button type="submit" variant="destructive" disabled={update.isPending}>Confirmar cancelamento</Button></div></form> : <div className="flex flex-wrap gap-2 border-t pt-4">
      {["agendado", "confirmado"].includes(appointment.status) ? <Button variant="outline" size="sm" onClick={onEdit}><Pencil />Editar</Button> : null}
      {canMove(appointment) ? <Button variant="outline" size="sm" onClick={() => setMode("move")}><CalendarClock />Mover / reagendar</Button> : null}
      {statusActions(appointment.status).map((status) => { const action = ACTIONS[status as keyof typeof ACTIONS]; return <Button key={status} variant="outline" size="sm" disabled={update.isPending} onClick={() => status === "cancelado" ? setMode("cancel") : changeStatus(status as AppointmentStatus)}><action.icon />{action.label}</Button>; })}
      {appointment.patient_id ? <Button variant="ghost" size="sm" asChild><Link to="/pacientes/$id" params={{ id: appointment.patient_id }} search={{ schedule: undefined }}><UserRound />Abrir paciente</Link></Button> : null}
      <Button variant="ghost" size="sm" asChild><Link to="/atendimentos/$id" params={{ id: appointment.id }}>Atendimento completo<ArrowRight /></Link></Button>
    </div>}
    {events?.length ? <details className="border-t pt-3 text-sm"><summary className="cursor-pointer font-medium">Histórico de horários e ações</summary><ul className="mt-3 space-y-2 text-xs text-muted-foreground">{events.map((event) => <li key={event.id}>{event.event_type} · {new Date(event.created_at).toLocaleString("pt-BR", { timeZone })}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ul></details> : null}
  </DialogContent></Dialog>;
}