import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/ui/detail-row";
import { Textarea } from "@/components/ui/textarea";
import {
  useAppointment,
  useDeleteAppointment,
  useEvolutionByAppointment,
  useSaveAppointment,
  useSaveEvolution,
} from "@/lib/data";
import {
  APPOINTMENT_MODALITIES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  formatDateLong,
  formatTime,
  labelOf,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/atendimentos/$id")({
  head: () => ({
    meta: [
      { title: "Atendimento — TeraClini" },
      { name: "description", content: "Registro privado de atendimento e evolução." },
      { property: "og:title", content: "Atendimento — TeraClini" },
      { property: "og:description", content: "Registro privado de atendimento e evolução." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppointmentPage,
});

function AppointmentPage() {
  const { id } = useParams({ from: "/_authenticated/atendimentos/$id" });
  const { data: appointment, isLoading } = useAppointment(id);
  const { data: evolution } = useEvolutionByAppointment(id);
  const saveEvolution = useSaveEvolution();
  const saveAppointment = useSaveAppointment();
  const deleteAppointment = useDeleteAppointment();
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setContent(evolution?.content ?? "");
  }, [evolution]);

  if (isLoading || !appointment) {
    return (
      <AppShell title="Atendimento">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }

  async function markDone() {
    if (!appointment) return;
    try {
      await saveAppointment.mutateAsync({
        id: appointment.id,
        patient_id: appointment.patient_id,
        location_id: appointment.location_id,
        starts_at: appointment.starts_at,
        ends_at: appointment.ends_at,
        type: appointment.type,
        modality: appointment.modality,
        status: "realizado",
        notes: appointment.notes,
        package_id: appointment.package_id,
        package_session_value: appointment.package_session_value,
      });
      toast.success("Atendimento marcado como realizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  async function handleSaveEvolution(event: FormEvent) {
    event.preventDefault();
    if (!appointment?.patient_id) {
      toast.error("Vincule um paciente ao atendimento antes de registrar a evolução.");
      return;
    }
    if (!content.trim()) {
      toast.error("Escreva a evolução antes de salvar.");
      return;
    }
    try {
      await saveEvolution.mutateAsync({
        ...(evolution ? { id: evolution.id } : {}),
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        content: content.trim(),
      });
      toast.success("Evolução registrada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    const confirmed = window.confirm(
      "Excluir este atendimento? O agendamento será removido permanentemente. Registros clínicos vinculados podem ser afetados.",
    );
    if (!confirmed) return;
    try {
      await deleteAppointment.mutateAsync(appointment.id);
      toast.success("Agendamento removido.");
      navigate({ to: "/agenda" });
    } catch {
      toast.error("Não foi possível remover.");
    }
  }

  return (
    <AppShell
      title={appointment.patient?.full_name ?? "Atendimento"}
      description={`${formatDateLong(appointment.starts_at)} · ${formatTime(appointment.starts_at)} às ${formatTime(appointment.ends_at)}`}
      action={
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          Editar
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Registro administrativo</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <DetailRow label="Tipo" value={labelOf(APPOINTMENT_TYPES, appointment.type)} />
            <DetailRow
              label="Modalidade"
              value={labelOf(APPOINTMENT_MODALITIES, appointment.modality)}
            />
            <DetailRow label="Local" value={appointment.location?.name ?? "—"} />
            <DetailRow label="Situação" value={labelOf(APPOINTMENT_STATUSES, appointment.status)} />
            {appointment.package_id ? <DetailRow label="Pacote" value="Sessão vinculada" /> : null}
          </dl>
          {appointment.notes ? (
            <p className="mt-3 text-sm text-muted-foreground">{appointment.notes}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {appointment.status !== "realizado" ? (
              <Button variant="secondary" onClick={markDone}>
                Marcar como realizado
              </Button>
            ) : (
              <Badge>Realizado</Badge>
            )}
            {appointment.patient_id ? (
              <Button asChild variant="ghost">
                <Link
                  to="/pacientes/$id"
                  params={{ id: appointment.patient_id }}
                  search={{ schedule: undefined }}
                >
                  Abrir paciente
                </Link>
              </Button>
            ) : null}
            {appointment.package_id ? (
              <Button asChild variant="ghost">
                <Link to="/pacotes/$id" params={{ id: appointment.package_id }}>
                  Abrir pacote
                </Link>
              </Button>
            ) : null}
            <Button variant="ghost" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>

        <form onSubmit={handleSaveEvolution} className="surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Registrar evolução</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Registro clínico vinculado a este atendimento.
            {evolution
              ? ` Última atualização em ${new Date(evolution.updated_at).toLocaleString("pt-BR")}.`
              : ""}
          </p>
          <Textarea
            className="mt-3"
            rows={12}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="O que foi trabalhado, observações e encaminhamentos..."
          />
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={saveEvolution.isPending}>
              {evolution ? "Atualizar evolução" : "Salvar evolução"}
            </Button>
          </div>
        </form>
      </div>

      <AppointmentDialog open={editOpen} onOpenChange={setEditOpen} appointment={appointment} />
    </AppShell>
  );
}
