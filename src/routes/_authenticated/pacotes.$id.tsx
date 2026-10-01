import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PackageDialog } from "@/components/packages/PackageDialog";
import { PackageStatusBadge } from "@/components/packages/PackageStatusBadge";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatTime } from "@/lib/domain";
import { packageUsage, useCancelPackage, usePackage, usePackageEvents } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/pacotes/$id")({
  head: () => ({ meta: [
    { title: "Detalhes do pacote — TeraClini" },
    { name: "description", content: "Utilização, sessões e histórico do pacote." },
    { property: "og:title", content: "Detalhes do pacote — TeraClini" },
    { property: "og:description", content: "Utilização, sessões e histórico do pacote." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PackageDetailsPage,
});

function PackageDetailsPage() {
  const { id } = useParams({ from: "/_authenticated/pacotes/$id" });
  const { data: item, isLoading } = usePackage(id);
  const { data: events } = usePackageEvents(id);
  const cancelPackage = useCancelPackage();
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  if (isLoading || !item) return <AppShell title="Pacote"><p className="text-sm text-muted-foreground">Carregando...</p></AppShell>;
  const { used, remaining } = packageUsage(item);
  const completed = item.appointments.filter((appointment) => appointment.status === "realizado").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  async function cancel() {
    if (!item || !window.confirm("Cancelar este pacote? O histórico e os atendimentos serão preservados.")) return;
    try { await cancelPackage.mutateAsync(item.id); toast.success("Pacote cancelado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível cancelar."); }
  }
  return (
    <AppShell title={item.patient.full_name} description={item.appointment_type?.name ?? "Pacote de atendimentos"} action={<Button variant="outline" onClick={() => setEditOpen(true)}>Editar</Button>}>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="surface p-5 lg:col-span-1">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Resumo</h2><PackageStatusBadge item={item} /></div>
          <p className="mt-5 text-3xl font-semibold">{remaining}</p><p className="text-sm text-muted-foreground">sessão{remaining === 1 ? "" : "ões"} restante{remaining === 1 ? "" : "s"}</p>
          <Progress className="mt-4" value={Math.min((used / item.quantity) * 100, 100)} />
          <dl className="mt-5 space-y-1.5 text-sm"><DetailRow label="Contratadas" value={String(item.quantity)} /><DetailRow label="Realizadas" value={String(used)} /><DetailRow label="Valor total" value={item.total_value === null ? "Valor a definir" : item.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} /><DetailRow label="Por sessão" value={item.value_per_session === null ? "Valor a definir" : item.value_per_session.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} /><DetailRow label="Início" value={formatDate(item.start_date)} /><DetailRow label="Término" value={item.end_date ? formatDate(item.end_date) : "Sem término definido"} /><DetailRow label="Aviso" value={`${item.renewal_alert_threshold} sessão(ões) restante(s)`} /></dl>
          <div className="mt-5 flex flex-wrap gap-2">{item.lifecycle_status === "ativo" ? <><Button onClick={() => setRenewOpen(true)}>Renovar pacote</Button><Button variant="ghost" onClick={cancel}>Cancelar pacote</Button></> : null}<Button asChild variant="ghost"><Link to="/pacientes/$id" params={{ id: item.patient_id }}>Abrir paciente</Link></Button></div>
        </section>
        <div className="space-y-5 lg:col-span-2">
          <section className="surface p-5"><h2 className="font-semibold">Sessões realizadas</h2>{completed.length ? <ol className="mt-4 space-y-3">{completed.map((appointment, index) => <li key={appointment.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div><Link className="text-sm font-medium hover:underline" to="/atendimentos/$id" params={{ id: appointment.id }}>Sessão {index + 1}/{item.quantity}</Link><p className="text-xs text-muted-foreground">{formatDate(appointment.starts_at)} · {formatTime(appointment.starts_at)}</p></div><span className="text-sm">{appointment.package_session_value === null ? "Valor não definido" : appointment.package_session_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">Nenhuma sessão realizada ainda.</p>}</section>
          <section className="surface p-5"><h2 className="font-semibold">Histórico do pacote</h2>{events?.length ? <ol className="mt-4 space-y-3 border-l pl-5">{events.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" /><p className="text-sm font-medium">{event.event_type === "criado" ? "Pacote criado" : event.event_type === "renovado" ? "Pacote renovado" : event.event_type === "cancelado" ? "Pacote cancelado" : "Pacote alterado"}</p><p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("pt-BR")}{event.changed_fields.length ? ` · ${event.changed_fields.join(", ")}` : ""}</p></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">Nenhum evento registrado.</p>}</section>
        </div>
      </div>
      <PackageDialog open={editOpen} onOpenChange={setEditOpen} item={item} />
      <PackageDialog open={renewOpen} onOpenChange={setRenewOpen} renewFrom={item} />
    </AppShell>
  );
}