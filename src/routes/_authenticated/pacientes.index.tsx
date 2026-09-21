import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

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
  head: () => ({ meta: [
    { title: "Meus Pacientes — Projeto Prática" },
    { name: "description", content: "Pacientes vinculados ao seu espaço profissional individual." },
    { property: "og:title", content: "Meus Pacientes — Projeto Prática" },
    { property: "og:description", content: "Pacientes vinculados ao seu espaço profissional individual." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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
      action={
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo paciente</span>
        </Button>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
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
              className="surface flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{patient.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
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
