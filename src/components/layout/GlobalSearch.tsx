import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, MapPin, User } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/lib/data";
import { LOCATION_TYPES, labelOf } from "@/lib/domain";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const { data, isFetching } = useGlobalSearch(term);
  const navigate = useNavigate();

  function go(to: string, params?: Record<string, string>) {
    onOpenChange(false);
    setTerm("");
    navigate({ to, params } as never);
  }

  const empty =
    term.trim().length >= 2 &&
    !isFetching &&
    data &&
    data.patients.length === 0 &&
    data.locations.length === 0 &&
    data.documents.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 max-w-lg translate-y-0">
        <DialogHeader>
          <DialogTitle>Buscar</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Paciente, local ou documento..."
        />
        <div className="max-h-80 space-y-4 overflow-y-auto">
          {term.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground">Digite ao menos duas letras.</p>
          ) : null}
          {empty ? <p className="text-sm text-muted-foreground">Nada encontrado.</p> : null}

          {data?.patients.length ? (
            <Section title="Pacientes">
              {data.patients.map((patient) => (
                <Result
                  key={patient.id}
                  icon={<User className="size-4" />}
                  title={patient.full_name}
                  subtitle="Abrir perfil do paciente"
                  onClick={() => go("/pacientes/$id", { id: patient.id })}
                />
              ))}
            </Section>
          ) : null}

          {data?.locations.length ? (
            <Section title="Locais">
              {data.locations.map((location) => (
                <Result
                  key={location.id}
                  icon={<MapPin className="size-4" />}
                  title={location.name}
                  subtitle={labelOf(LOCATION_TYPES, location.type)}
                  onClick={() => go("/locais")}
                />
              ))}
            </Section>
          ) : null}

          {data?.documents.length ? (
            <Section title="Documentos">
              {data.documents.map((document) => (
                <Result
                  key={document.id}
                  icon={<FileText className="size-4" />}
                  title={document.title}
                  subtitle="Abrir na lista de documentos"
                  onClick={() =>
                    document.patient_id
                      ? go("/pacientes/$id", { id: document.patient_id })
                      : go("/documentos")
                  }
                />
              ))}
            </Section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Result({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
