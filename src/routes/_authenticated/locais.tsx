import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { LocationDialog } from "@/components/LocationDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeleteLocation, useLocations, type Location } from "@/lib/data";
import { LOCATION_TYPES, labelOf } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/locais")({
  head: () => ({
    meta: [
      { title: "Meus Locais — Projeto Prática" },
      { name: "description", content: "Locais onde você realiza seus atendimentos." },
      { property: "og:title", content: "Meus Locais — Projeto Prática" },
      { property: "og:description", content: "Locais onde você realiza seus atendimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LocationsPage,
});

function LocationsPage() {
  const { data: locations, isLoading } = useLocations();
  const deleteLocation = useDeleteLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | undefined>();

  async function handleDelete(location: Location) {
    try {
      await deleteLocation.mutateAsync(location.id);
      toast.success("Local removido.");
    } catch {
      toast.error("Não foi possível remover este local.");
    }
  }

  return (
    <AppShell
      title="Meus locais"
      description="O local é uma característica do atendimento — nunca do paciente"
      action={
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo local</span>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && (locations?.length ?? 0) === 0 ? (
          <div className="surface p-8 text-center sm:col-span-2">
            <p className="text-sm text-muted-foreground">Você ainda não cadastrou locais.</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              Cadastrar local
            </Button>
          </div>
        ) : null}

        {(locations ?? []).map((location) => (
          <div key={location.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{location.name}</p>
                <Badge variant="secondary" className="mt-1.5">
                  {labelOf(LOCATION_TYPES, location.type)}
                </Badge>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => {
                    setEditing(location);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover"
                  onClick={() => handleDelete(location)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {location.address ? (
              <p className="mt-3 text-sm text-muted-foreground">{location.address}</p>
            ) : null}
            {location.contact ? (
              <p className="text-sm text-muted-foreground">{location.contact}</p>
            ) : null}
          </div>
        ))}
      </div>

      <LocationDialog open={dialogOpen} onOpenChange={setDialogOpen} location={editing} />
    </AppShell>
  );
}
