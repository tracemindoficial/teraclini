import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PatientDialog } from "@/components/PatientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePatients } from "@/lib/data";
import { AGE_GROUPS, PATIENT_STATUSES, ageFromBirthDate, labelOf } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  head: () => ({
    meta: [
      { title: "Meus Pacientes — TeraClini" },
      {
        name: "description",
        content: "Pacientes vinculados ao seu espaço profissional individual.",
      },
      { property: "og:title", content: "Meus Pacientes — TeraClini" },
      {
        property: "og:description",
        content: "Pacientes vinculados ao seu espaço profissional individual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: patients, isLoading } = usePatients(search);

  const filtered = (patients ?? []).filter((p) => status === "todos" || p.status === status);

  return (
    <AppShell
      title="Pacientes"
      description="Seus pacientes, independentemente do local"
      action={<div className="flex gap-2"><Button asChild variant="outline" className="gap-2"><Link to="/pacientes/pre-cadastros"><ClipboardList className="size-4" /><span className="hidden sm:inline">Pré-cadastros</span></Link></Button><Button className="gap-2" onClick={() => setDialogOpen(true)}><Plus className="size-4" /><span className="hidden sm:inline">Novo paciente</span></Button></div>}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,20rem)_12rem]">
        <Input
          className="w-full"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            {PATIENT_STATUSES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 space-y-2.5">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && filtered.length === 0 ? (
          <div className="surface p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              Cadastrar paciente
            </Button>
          </div>
        ) : null}

        {filtered.map((patient) => {
          const age = ageFromBirthDate(patient.birth_date);
          return (
            <Link
              key={patient.id}
              to="/pacientes/$id"
              params={{ id: patient.id }}
              className="surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{patient.full_name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:truncate">
                  {labelOf(AGE_GROUPS, patient.age_group)}
                  {age !== null ? ` · ${age} anos` : ""}
                  {patient.phone ? ` · ${patient.phone}` : ""}
                </p>
              </div>
              <Badge variant="secondary">{labelOf(PATIENT_STATUSES, patient.status)}</Badge>
            </Link>
          );
        })}
      </div>

      <PatientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  );
}
