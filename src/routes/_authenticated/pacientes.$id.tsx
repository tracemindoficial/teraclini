import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CalendarPlus, Pencil, Plus } from "lucide-react";
import { z } from "zod";

import { AppShell } from "@/components/layout/AppShell";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { PatientDialog } from "@/components/PatientDialog";
import { AnamnesisDialog } from "@/components/AnamnesisDialog";
import { DocumentsPanel } from "@/components/patients/DocumentsPanel";
import { PackageCard } from "@/components/packages/PackageCard";
import { PackageDialog } from "@/components/packages/PackageDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/ui/detail-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAnamneses,
  useDocuments,
  useEvolutions,
  useGuardians,
  usePatient,
  usePatientAppointments,
  usePackages,
  type CarePackageWithRefs,
  type Anamnesis,
} from "@/lib/data";
import {
  AGE_GROUPS,
  APPOINTMENT_TYPES,
  DOCUMENT_CATEGORIES,
  PATIENT_STATUSES,
  ageFromBirthDate,
  formatDate,
  formatTime,
  labelOf,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  validateSearch: z.object({ schedule: z.coerce.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Prontuário do Paciente — TeraClini" },
      { name: "description", content: "Prontuário privado do seu paciente." },
      { property: "og:title", content: "Prontuário do Paciente — TeraClini" },
      { property: "og:description", content: "Prontuário privado do seu paciente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientProfile,
});

function PatientProfile() {
  const { id } = useParams({ from: "/_authenticated/pacientes/$id" });
  const schedule = Route.useSearch({ select: (search) => search.schedule });
  const { data: patient, isLoading } = usePatient(id);
  const { data: guardians } = useGuardians(id);
  const { data: appointments } = usePatientAppointments(id);
  const { data: evolutions } = useEvolutions(id);
  const { data: anamneses } = useAnamneses(id);
  const { data: documents } = useDocuments(id);
  const { data: packages } = usePackages(id);

  const [editOpen, setEditOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(Boolean(schedule));
  const [anamnesisOpen, setAnamnesisOpen] = useState(false);
  const [editingAnamnesis, setEditingAnamnesis] = useState<Anamnesis | undefined>();
  const [packageOpen, setPackageOpen] = useState(false);
  const [renewPackage, setRenewPackage] = useState<CarePackageWithRefs | undefined>();

  if (isLoading || !patient) {
    return (
      <AppShell title="Paciente">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }

  const age = ageFromBirthDate(patient.birth_date);
  const now = new Date();
  const upcoming = (appointments ?? []).filter((a) => new Date(a.starts_at) >= now).reverse();
  const past = (appointments ?? []).filter((a) => new Date(a.starts_at) < now);

  const timeline = [
    ...(appointments ?? []).map((a) => ({
      at: a.starts_at,
      title: labelOf(APPOINTMENT_TYPES, a.type),
      detail: a.location?.name ?? "Sem local",
      kind: "Atendimento",
      to: `/atendimentos/${a.id}`,
    })),
    ...(evolutions ?? []).map((e) => ({
      at: e.recorded_at,
      title: "Evolução registrada",
      detail: e.content.slice(0, 80),
      kind: "Registro clínico",
      to: `/atendimentos/${e.appointment_id}`,
    })),
    ...(anamneses ?? []).map((a) => ({
      at: a.created_at,
      title: a.is_completed ? "Anamnese concluída" : "Anamnese iniciada",
      detail: a.title,
      kind: "Registro clínico",
      to: null,
    })),
    ...(documents ?? []).map((d) => ({
      at: d.created_at,
      title: "Documento anexado",
      detail: d.title,
      kind: labelOf(DOCUMENT_CATEGORIES, d.category),
      to: null,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <AppShell
      title={patient.full_name}
      description={`${labelOf(AGE_GROUPS, patient.age_group)}${age !== null ? ` · ${age} anos` : ""}`}
      action={
        <Button className="gap-2" onClick={() => setAppointmentOpen(true)}>
          <CalendarPlus className="size-4" />
          <span className="hidden sm:inline">Agendar</span>
        </Button>
      }
    >
      <Tabs defaultValue="resumo">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="historico">Prontuário</TabsTrigger>
          <TabsTrigger value="anamneses">Anamneses</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="surface p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold">Dados cadastrais</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <DetailRow label="Situação" value={labelOf(PATIENT_STATUSES, patient.status)} />
              <DetailRow
                label="Nascimento"
                value={patient.birth_date ? formatDate(patient.birth_date) : "—"}
              />
              <DetailRow label="Sexo" value={patient.gender ?? "—"} />
              <DetailRow label="Telefone" value={patient.phone ?? "—"} />
              <DetailRow label="E-mail" value={patient.email ?? "—"} />
              <DetailRow label="Endereço" value={patient.address ?? "—"} />
            </dl>
          </div>

          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Responsáveis</h2>
            {guardians && guardians.length > 0 ? (
              <ul className="mt-3 space-y-3 text-sm">
                {guardians.map((guardian) => (
                  <li key={guardian.id}>
                    <p className="font-medium">{guardian.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[guardian.relationship, guardian.phone, guardian.email]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Próximos atendimentos</h2>
            {upcoming.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {upcoming.slice(0, 5).map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      to="/atendimentos/$id"
                      params={{ id: appointment.id }}
                      className="flex justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-accent"
                    >
                      <span>
                        {formatDate(appointment.starts_at)} · {formatTime(appointment.starts_at)}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {appointment.location?.name ?? "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum atendimento agendado.</p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Observações</h2>
            <p className="mt-2 text-sm text-muted-foreground">{patient.notes || "—"}</p>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-5">
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Linha do tempo clínica</h2>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum registro ainda.</p>
            ) : (
              <ol className="mt-4 space-y-4 border-l pl-5">
                {timeline.map((item, index) => (
                  <li key={index} className="relative">
                    <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" />
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.at)} · {item.kind}
                    </p>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="surface mt-4 p-5">
            <h2 className="text-sm font-semibold">Atendimentos realizados</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {past.length === 0 ? (
                <li className="text-muted-foreground">Nenhum atendimento anterior.</li>
              ) : null}
              {past.map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    to="/atendimentos/$id"
                    params={{ id: appointment.id }}
                    className="flex justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-accent"
                  >
                    <span>
                      {formatDate(appointment.starts_at)} ·{" "}
                      {labelOf(APPOINTMENT_TYPES, appointment.type)}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {appointment.location?.name ?? "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="anamneses" className="mt-5">
          <Button
            className="gap-2"
            onClick={() => {
              setEditingAnamnesis(undefined);
              setAnamnesisOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova anamnese
          </Button>
          <div className="mt-4 space-y-2.5">
            {(anamneses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma anamnese registrada.</p>
            ) : null}
            {(anamneses ?? []).map((anamnesis) => (
              <button
                key={anamnesis.id}
                onClick={() => {
                  setEditingAnamnesis(anamnesis);
                  setAnamnesisOpen(true);
                }}
                className="surface flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span>
                  <span className="block font-medium">{anamnesis.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(anamnesis.created_at)} · modelo {anamnesis.template_key}
                  </span>
                </span>
                <Badge variant={anamnesis.is_completed ? "default" : "secondary"}>
                  {anamnesis.is_completed ? "Concluída" : "Em andamento"}
                </Badge>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-5">
          <DocumentsPanel patientId={id} />
        </TabsContent>

        <TabsContent value="pacotes" className="mt-5">
          <Button
            className="gap-2"
            onClick={() => {
              setRenewPackage(undefined);
              setPackageOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo pacote
          </Button>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {(packages ?? []).map((item) => (
              <PackageCard
                key={item.id}
                item={item}
                onRenew={(source) => {
                  setRenewPackage(source);
                  setPackageOpen(true);
                }}
              />
            ))}
            {(packages ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pacote cadastrado.</p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <PatientDialog open={editOpen} onOpenChange={setEditOpen} patient={patient} />
      <AppointmentDialog
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        defaultPatientId={patient.id}
      />
      <AnamnesisDialog
        open={anamnesisOpen}
        onOpenChange={setAnamnesisOpen}
        patientId={id}
        anamnesis={editingAnamnesis}
      />
      <PackageDialog
        open={packageOpen}
        onOpenChange={setPackageOpen}
        defaultPatientId={id}
        renewFrom={renewPackage}
      />
    </AppShell>
  );
}
