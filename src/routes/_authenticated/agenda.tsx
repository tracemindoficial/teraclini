import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments, useLocations } from "@/lib/data";
import { APPOINTMENT_STATUSES, formatDateLong } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Minha Agenda — TeraClini" },
      {
        name: "description",
        content: "Agenda individual com todos os seus locais de atendimento.",
      },
      { property: "og:title", content: "Minha Agenda — TeraClini" },
      {
        property: "og:description",
        content: "Agenda individual com todos os seus locais de atendimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agenda,
});

type View = "dia" | "semana" | "mes";

function rangeFor(view: View, anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (view === "dia") end.setDate(end.getDate() + 1);
  if (view === "semana") {
    start.setDate(start.getDate() - start.getDay());
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  }
  if (view === "mes") {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  }
  return { start, end };
}

function Agenda() {
  const [view, setView] = useState<View>("dia");
  const [anchor, setAnchor] = useState(new Date());
  const [locationId, setLocationId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { start, end } = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const { data: locations } = useLocations();
  const { data: appointments, isLoading } = useAppointments({
    from: start.toISOString(),
    to: end.toISOString(),
    locationId: locationId === "todos" ? undefined : locationId,
  });

  const filtered = (appointments ?? []).filter(
    (appointment) => status === "todos" || appointment.status === status,
  );

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, appointment) => {
    const key = new Date(appointment.starts_at).toDateString();
    acc[key] = [...(acc[key] ?? []), appointment];
    return acc;
  }, {});

  function shift(direction: number) {
    const next = new Date(anchor);
    if (view === "dia") next.setDate(next.getDate() + direction);
    if (view === "semana") next.setDate(next.getDate() + 7 * direction);
    if (view === "mes") next.setMonth(next.getMonth() + direction);
    setAnchor(next);
  }

  return (
    <AppShell
      title="Agenda"
      description="Todos os locais em uma única visão"
      action={
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo agendamento</span>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] xl:items-center">
        <Tabs value={view} onValueChange={(value) => setView(value as View)}>
          <TabsList>
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 sm:justify-end xl:justify-start">
          <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => setAnchor(new Date())}>
            Hoje
          </Button>
        </div>

        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-full xl:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os locais</SelectItem>
            {(locations ?? []).map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full xl:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            {APPOINTMENT_STATUSES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 space-y-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && filtered.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            Nenhum atendimento neste período.
          </div>
        ) : null}
        {Object.entries(grouped).map(([day, items]) => (
          <section key={day}>
            <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
              {formatDateLong(new Date(day))}
            </h2>
            <ul className="space-y-2.5">
              {items.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <AppointmentDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultDate={anchor} />
    </AppShell>
  );
}
