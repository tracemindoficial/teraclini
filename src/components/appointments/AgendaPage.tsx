import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, LockKeyhole, Plus, Settings2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AvailabilityDialog } from "@/components/AvailabilityDialog";
import { ScheduleBlockDialog } from "@/components/ScheduleBlockDialog";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { AppointmentQuickDetails } from "./AppointmentQuickDetails";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments, useAvailabilityRules, useDeleteAvailabilityRule, useDeleteScheduleBlock, useLocations, useScheduleBlocks, useUpdateAppointment, type AppointmentWithRefs, type AvailabilityRule, type ScheduleBlock } from "@/lib/data";
import { APPOINTMENT_STATUSES, WEEKDAYS, formatDateLong } from "@/lib/domain";
import { AGENDA_TIMEZONE, addDays, agendaRange, canMove, hasConflict, localParts, movedTimes } from "@/lib/agenda-rules";

const AgendaCalendar = lazy(() => import("./AgendaCalendar").then((module) => ({ default: module.AgendaCalendar })));
type View = "dia" | "semana" | "mes" | "lista";

export function AgendaPage() {
  const [view, setView] = useState<View>("semana");
  const [anchor, setAnchor] = useState(() => localParts(new Date()).date);
  const [locationId, setLocationId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [modality, setModality] = useState("todos");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDate, setCreateDate] = useState(anchor);
  const [createTime, setCreateTime] = useState("09:00");
  const [edit, setEdit] = useState<AppointmentWithRefs>();
  const [selectedId, setSelectedId] = useState<string>();
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [editRule, setEditRule] = useState<AvailabilityRule>();
  const [blockOpen, setBlockOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<ScheduleBlock>();
  const { data: availability = [], error: availabilityError } = useAvailabilityRules();
  const timeZone = availability.find((rule) => rule.is_active)?.timezone ?? AGENDA_TIMEZONE;
  const range = useMemo(() => agendaRange(anchor, view, timeZone), [anchor, view, timeZone]);
  const { data: locations = [] } = useLocations();
  const { data: appointments = [], isLoading, error, refetch } = useAppointments({ from: range.from, to: range.to });
  const { data: blocks = [], error: blockError } = useScheduleBlocks(range.from, range.to);
  const update = useUpdateAppointment();
  const deleteRule = useDeleteAvailabilityRule();
  const deleteBlock = useDeleteScheduleBlock();
  const filtered = appointments.filter((item) => (locationId === "todos" || item.location_id === locationId) && (status === "todos" || item.status === status) && (modality === "todos" || item.modality === modality) && (!search || `${item.patient?.full_name ?? ""} ${item.service_name_snapshot ?? item.appointment_type?.name ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const visibleBlocks = blocks.filter((item) => locationId === "todos" || !item.location_id || item.location_id === locationId);
  const visibleAvailability = availability.filter((item) => locationId === "todos" || !item.location_id || item.location_id === locationId);
  const selected = appointments.find((item) => item.id === selectedId);
  const baseDate = useMemo(() => new Date(`${createDate}T12:00:00`), [createDate]);
  const grouped = filtered.reduce<Record<string, AppointmentWithRefs[]>>((acc, appointment) => { const day = localParts(appointment.starts_at, timeZone).date; (acc[day] ??= []).push(appointment); return acc; }, {});

  function shift(direction: number) {
    if (view === "mes") { const next = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + direction); setAnchor(next.toISOString().slice(0, 10)); }
    else setAnchor(addDays(anchor, (view === "dia" ? 1 : 7) * direction));
  }
  function create(date: string, time: string) { setEdit(undefined); setCreateDate(date); setCreateTime(time); setDialogOpen(true); }
  async function move(appointment: AppointmentWithRefs, startsAt: string) {
    try {
      if (!canMove(appointment)) throw new Error("Atendimentos históricos, concluídos ou em andamento não podem ser movimentados.");
      const times = movedTimes(appointment, startsAt);
      if (hasConflict(appointment, times.starts_at, times.ends_at, appointments)) throw new Error("Este horário conflita com outro atendimento.");
      await update.mutateAsync({ id: appointment.id, ...times });
      toast.success("Horário atualizado. Duração e vínculos preservados.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível mover."); throw error; }
  }
  const dateLabel = view === "dia" ? formatDateLong(`${anchor}T12:00:00`) : view === "mes" ? new Date(`${anchor}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : `${new Date(`${range.start}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${new Date(`${addDays(range.end, -1)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  return <AppShell title="Minha Agenda" action={<Button aria-label="Novo agendamento" onClick={() => create(anchor, "09:00")}><Plus /><span className="hidden sm:inline">Novo agendamento</span></Button>}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" aria-label="Período anterior" onClick={() => shift(-1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Próximo período" onClick={() => shift(1)}><ChevronRight /></Button><Button variant="ghost" onClick={() => setAnchor(localParts(new Date(), timeZone).date)}>Hoje</Button><h2 className="text-sm font-semibold capitalize sm:text-base">{dateLabel}</h2></div>
      <div className="flex items-center gap-2"><Tabs value={view} onValueChange={(value) => setView(value as View)}><TabsList><TabsTrigger value="dia">Dia</TabsTrigger><TabsTrigger value="semana">Semana</TabsTrigger><TabsTrigger value="mes">Mês</TabsTrigger><TabsTrigger value="lista">Lista</TabsTrigger></TabsList></Tabs><Button variant={filtersOpen ? "secondary" : "outline"} size="icon" title="Filtros" aria-label="Filtros" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /></Button><Button variant={settingsOpen ? "secondary" : "outline"} size="icon" title="Disponibilidade e bloqueios" aria-label="Disponibilidade e bloqueios" onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 /></Button></div>
    </div>
    {filtersOpen ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Input aria-label="Buscar paciente ou serviço" placeholder="Paciente ou serviço" value={search} onChange={(event) => setSearch(event.target.value)} /><Select value={locationId} onValueChange={setLocationId}><SelectTrigger aria-label="Filtrar local"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os locais</SelectItem>{locations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filtrar situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as situações</SelectItem>{APPOINTMENT_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Select value={modality} onValueChange={setModality}><SelectTrigger aria-label="Filtrar modalidade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as modalidades</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="domiciliar">Domiciliar</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div> : null}
    {settingsOpen ? <section className="mt-4 space-y-3 border-y py-4"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setEditRule(undefined); setAvailabilityOpen(true); }}><Clock />Adicionar disponibilidade</Button><Button variant="outline" size="sm" onClick={() => { setEditBlock(undefined); setBlockOpen(true); }}><LockKeyhole />Bloquear horário</Button></div><ul className="space-y-2">{availability.map((rule) => <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{WEEKDAYS[rule.weekday]} · {rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}{rule.location_id ? ` · ${locations.find((item) => item.id === rule.location_id)?.name ?? "Local"}` : ""}</span><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => { setEditRule(rule); setAvailabilityOpen(true); }}>Editar</Button><Button variant="ghost" size="sm" onClick={async () => { if (!window.confirm("Remover esta disponibilidade?")) return; try { await deleteRule.mutateAsync(rule.id); } catch { toast.error("Não foi possível remover."); } }}>Remover</Button></div></li>)}{visibleBlocks.map((block) => <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Bloqueio · {block.reason} · {localParts(block.starts_at, timeZone).date}</span><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => { setEditBlock(block); setBlockOpen(true); }}>Editar</Button><Button variant="ghost" size="sm" onClick={async () => { if (!window.confirm("Remover este bloqueio?")) return; try { await deleteBlock.mutateAsync(block.id); } catch { toast.error("Não foi possível remover."); } }}>Remover</Button></div></li>)}</ul></section> : null}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><div className="flex flex-wrap gap-4"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-secondary" />Disponível</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border bg-card" />Sem disponibilidade definida</span><span className="flex items-center gap-1.5"><LockKeyhole className="size-3" />Bloqueado</span></div><span>{filtered.length} atendimentos · {timeZone}</span></div>
    {error || availabilityError || blockError ? <div role="alert" className="my-4 flex items-center gap-3 text-sm text-destructive">Não foi possível carregar toda a agenda.<Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button></div> : null}
    <div className="mt-3" aria-busy={isLoading}>{isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Carregando agenda…</p> : view === "lista" ? <div className="space-y-6">{filtered.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Nenhum atendimento neste período.</p> : Object.entries(grouped).map(([day, items]) => <section key={day}><h2 className="mb-2 text-sm font-semibold capitalize">{formatDateLong(`${day}T12:00:00`)}</h2><ul className="space-y-2">{items.map((item) => <AppointmentRow key={item.id} appointment={item} />)}</ul></section>)}</div> : <ClientOnly fallback={<p>Carregando agenda…</p>}><Suspense fallback={<p>Carregando agenda…</p>}><AgendaCalendar appointments={filtered} blocks={visibleBlocks} availability={visibleAvailability} anchor={anchor} view={view} timeZone={timeZone} onSelect={(item) => setSelectedId(item.id)} onCreate={create} onMove={move} onBlock={(block) => { setEditBlock(block); setBlockOpen(true); }} /></Suspense></ClientOnly>}</div>
    <AppointmentDialog open={dialogOpen} onOpenChange={setDialogOpen} appointment={edit} defaultDate={baseDate} defaultTime={createTime} timeZone={timeZone} />
    {selected ? <AppointmentQuickDetails key={selected.id} appointment={selected} timeZone={timeZone} onClose={() => setSelectedId(undefined)} onEdit={() => { setEdit(selected); setSelectedId(undefined); setDialogOpen(true); }} onMove={(start) => move(selected, start)} /> : null}
    <AvailabilityDialog open={availabilityOpen} onOpenChange={setAvailabilityOpen} rule={editRule} />
    <ScheduleBlockDialog open={blockOpen} onOpenChange={setBlockOpen} block={editBlock} />
  </AppShell>;
}