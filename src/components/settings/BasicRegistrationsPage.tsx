import { useMemo, useState, type FormEvent } from "react";
import { Edit2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AttendancePricingCard } from "@/components/settings/AttendancePricingCard";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { centsToReais, PRICE_MODALITIES, reaisToCents, SERVICE_CATEGORIES, type BillingType } from "@/lib/basic-registrations";
import { useAllAppointmentTypes, useSaveService, useSaveServicePrice, useSaveSpecialty, useServicePrices, useSpecialties, type Service, type ServicePrice, type Specialty } from "@/lib/data";

type StatusFilter = "all" | "active" | "inactive";

export function BasicRegistrationsPage() {
  const [tab, setTab] = useState("specialties");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [specialty, setSpecialty] = useState<Specialty | null | undefined>();
  const [service, setService] = useState<Service | null | undefined>();
  const [price, setPrice] = useState<ServicePrice | null | undefined>();
  const { data: specialties = [] } = useSpecialties();
  const { data: services = [] } = useAllAppointmentTypes();
  const { data: prices = [] } = useServicePrices();
  const filter = <T extends { is_active: boolean }>(items: T[], name: (item: T) => string) => items.filter((item) => (status === "all" || item.is_active === (status === "active")) && name(item).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const filteredSpecialties = useMemo(() => filter(specialties, (item) => item.name), [specialties, search, status]);
  const filteredServices = useMemo(() => filter(services, (item) => item.name), [services, search, status]);
  const filteredPrices = useMemo(() => filter(prices, (item) => item.appointment_type.name), [prices, search, status]);
  const action = tab === "specialties" ? () => setSpecialty(null) : tab === "services" ? () => setService(null) : () => setPrice(null);
  return <AppShell title="Cadastros Básicos" description="Informações reutilizáveis da sua prática" action={<Button onClick={action} className="gap-2"><Plus className="size-4"/><span className="hidden sm:inline">Novo cadastro</span></Button>}>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit"><TabsTrigger value="specialties">Especialidades</TabsTrigger><TabsTrigger value="services">Serviços</TabsTrigger><TabsTrigger value="prices">Valores</TabsTrigger></TabsList>
      <div className="my-5 grid gap-3 sm:grid-cols-[minmax(0,24rem)_12rem]"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar"/></div><Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem></SelectContent></Select></div>
      <TabsContent value="specialties"><RecordList items={filteredSpecialties} empty="Nenhuma especialidade encontrada." title={(item) => item.name} detail={() => "Especialidade profissional"} onEdit={setSpecialty}/></TabsContent>
      <TabsContent value="services"><RecordList items={filteredServices} empty="Nenhum serviço encontrado." title={(item) => item.name} detail={(item) => `${SERVICE_CATEGORIES.find(([key]) => key === item.category)?.[1] ?? "Outro"}`} onEdit={setService}/></TabsContent>
      <TabsContent value="prices"><AttendancePricingCard/><RecordList items={filteredPrices} empty="Nenhum valor encontrado." title={(item) => item.appointment_type.name} detail={(item) => `${item.duration_minutes} min · ${PRICE_MODALITIES.find(([key]) => key === item.modality)?.[1] ?? item.modality} · ${item.billing_type === "pacote" ? `Pacote ${item.package_quantity}` : "Avulso"} · ${centsToReais(item.price_cents)}`} onEdit={setPrice}/></TabsContent>
    </Tabs>
    <SpecialtyDialog item={specialty} open={specialty !== undefined} onClose={() => setSpecialty(undefined)}/>
    <ServiceDialog item={service} open={service !== undefined} onClose={() => setService(undefined)}/>
    <PriceDialog item={price} services={services.filter((item) => item.is_active || item.id === price?.appointment_type_id)} open={price !== undefined} onClose={() => setPrice(undefined)}/>
  </AppShell>;
}

function RecordList<T extends { id: string; is_active: boolean }>({ items, empty, title, detail, onEdit }: { items: T[]; empty: string; title: (item: T) => string; detail: (item: T) => string; onEdit: (item: T) => void }) {
  if (!items.length) return <div className="surface p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return <div className="surface divide-y overflow-hidden">{items.map((item) => <div key={item.id} className="flex min-h-20 items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate font-medium">{title(item)}</p><p className="mt-1 text-sm text-muted-foreground">{detail(item)}</p></div><Badge variant={item.is_active ? "secondary" : "outline"}>{item.is_active ? "Ativo" : "Inativo"}</Badge><Button variant="ghost" size="icon" aria-label={`Editar ${title(item)}`} onClick={() => onEdit(item)}><Edit2 className="size-4"/></Button></div>)}</div>;
}

function SpecialtyDialog({ item, open, onClose }: { item: Specialty | null | undefined; open: boolean; onClose: () => void }) {
  const save = useSaveSpecialty(); const [name, setName] = useState(""); const [active, setActive] = useState(true);
  function prepare(next: boolean) { if (next) { setName(item?.name ?? ""); setActive(item?.is_active ?? true); } }
  async function submit(event: FormEvent) { event.preventDefault(); try { await save.mutateAsync({ ...(item ? { id: item.id } : {}), name: name.trim().replace(/\s+/g, " "), is_active: active }); toast.success("Especialidade salva."); onClose(); } catch { toast.error("Já existe uma especialidade com esse nome ou os dados são inválidos."); } return; }
  return <Dialog open={open} onOpenChange={(next) => { prepare(next); if (!next) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{item ? "Editar especialidade" : "Nova especialidade"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Nome da especialidade"><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)}/></Field><StatusSwitch active={active} setActive={setActive}/><Actions pending={save.isPending} onClose={onClose}/></form></DialogContent></Dialog>;
}

function ServiceDialog({ item, open, onClose }: { item: Service | null | undefined; open: boolean; onClose: () => void }) {
  const save = useSaveService(); const [values, setValues] = useState({ name: "", description: "", category: "atendimento", active: true });
  function prepare(next: boolean) { if (next) setValues({ name: item?.name ?? "", description: item?.description ?? "", category: item?.category ?? "atendimento", active: item?.is_active ?? true }); }
  async function submit(event: FormEvent) { event.preventDefault(); try { await save.mutateAsync({ ...(item ? { id: item.id } : {}), name: values.name.trim().replace(/\s+/g, " "), description: values.description.trim() || null, category: values.category, is_active: values.active }); toast.success("Serviço salvo."); onClose(); } catch { toast.error("Já existe um serviço com esse nome ou os dados são inválidos."); } return; }
  return <Dialog open={open} onOpenChange={(next) => { prepare(next); if (!next) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{item ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Nome do serviço"><Input required minLength={2} value={values.name} onChange={(e) => setValues({...values,name:e.target.value})}/></Field><Field label="Descrição" optional><Textarea value={values.description} onChange={(e) => setValues({...values,description:e.target.value})}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo"><Select value={values.category} onValueChange={(category) => setValues({...values,category})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{SERVICE_CATEGORIES.map(([key,label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></Field></div><StatusSwitch active={values.active} setActive={(active) => setValues({...values,active})}/><Actions pending={save.isPending} onClose={onClose}/></form></DialogContent></Dialog>;
}

function PriceDialog({ item, services, open, onClose }: { item: ServicePrice | null | undefined; services: Service[]; open: boolean; onClose: () => void }) {
  const save = useSaveServicePrice(); const [values, setValues] = useState({ serviceId: "", price: "", duration: "50", modality: "todas", billing: "avulso" as BillingType, quantity: "4", active: true });
  function prepare(next: boolean) { if (next) setValues({ serviceId: item?.appointment_type_id ?? services[0]?.id ?? "", price: item ? (item.price_cents / 100).toFixed(2).replace(".", ",") : "", duration: String(item?.duration_minutes ?? 50), modality: item?.modality ?? "todas", billing: item?.billing_type as BillingType ?? "avulso", quantity: String(item?.package_quantity ?? 4), active: item?.is_active ?? true }); }
  async function submit(event: FormEvent) { event.preventDefault(); const cents = reaisToCents(values.price); const duration = Number(values.duration); const quantity = values.billing === "pacote" ? Number(values.quantity) : null; if (cents === null || cents < 0 || !values.serviceId || !Number.isInteger(duration) || duration < 5 || (quantity !== null && (!Number.isInteger(quantity) || quantity < 1))) { toast.error("Revise os dados do valor."); return; } try { await save.mutateAsync({ ...(item ? { id: item.id } : {}), appointmentTypeId: values.serviceId, priceCents: cents, durationMinutes: duration, modality: values.modality, billingType: values.billing, packageQuantity: quantity, isActive: values.active }); toast.success(item ? "Nova versão do valor salva." : "Valor salvo."); onClose(); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o valor."); } return; }
  return <Dialog open={open} onOpenChange={(next) => { prepare(next); if (!next) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{item ? "Editar valor" : "Novo valor"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Serviço"><Select value={values.serviceId} onValueChange={(serviceId) => setValues({...values,serviceId})}><SelectTrigger><SelectValue placeholder="Selecionar"/></SelectTrigger><SelectContent>{services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Valor"><Input inputMode="decimal" placeholder="R$ 0,00" required value={values.price} onChange={(e) => setValues({...values,price:e.target.value})}/></Field><Field label="Duração"><Input type="number" min={5} max={720} required value={values.duration} onChange={(e) => setValues({...values,duration:e.target.value})}/></Field><Field label="Modalidade"><Select value={values.modality} onValueChange={(modality) => setValues({...values,modality})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{PRICE_MODALITIES.map(([key,label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Tipo de cobrança"><Select value={values.billing} onValueChange={(billing) => setValues({...values,billing:billing as BillingType})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="avulso">Avulso</SelectItem><SelectItem value="pacote">Pacote</SelectItem></SelectContent></Select></Field>{values.billing === "pacote" ? <Field label="Quantidade"><Input type="number" min={1} required value={values.quantity} onChange={(e) => setValues({...values,quantity:e.target.value})}/></Field> : null}</div><StatusSwitch active={values.active} setActive={(active) => setValues({...values,active})}/><Actions pending={save.isPending} onClose={onClose}/></form></DialogContent></Dialog>;
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}{optional ? " (opcional)" : ""}</Label>{children}</div>; }
function StatusSwitch({ active, setActive }: { active: boolean; setActive: (active: boolean) => void }) { return <div className="flex items-center justify-between rounded-md border p-3"><div><p className="text-sm font-medium">Status</p><p className="text-xs text-muted-foreground">{active ? "Ativo para novos registros" : "Inativo, preservado no histórico"}</p></div><Switch checked={active} onCheckedChange={setActive} aria-label="Status ativo"/></div>; }
function Actions({ pending, onClose }: { pending: boolean; onClose: () => void }) { return <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>Salvar</Button></div>; }