import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PackageCard } from "@/components/packages/PackageCard";
import { PackageDialog } from "@/components/packages/PackageDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { packageStatus, usePackages, type CarePackageWithRefs } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/pacotes")({
  head: () => ({ meta: [
    { title: "Pacotes de atendimentos — TeraClini" },
    { name: "description", content: "Controle de sessões e renovações dos seus pacientes." },
    { property: "og:title", content: "Pacotes de atendimentos — TeraClini" },
    { property: "og:description", content: "Controle de sessões e renovações dos seus pacientes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PackagesPage,
});

function PackagesPage() {
  const navigate = useNavigate();
  const { data: packages, isLoading } = usePackages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renewFrom, setRenewFrom] = useState<CarePackageWithRefs | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const [period, setPeriod] = useState("all");
  const filtered = useMemo(() => (packages ?? []).filter((item) => {
    const matchesSearch = item.patient.full_name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"));
    const matchesStatus = status === "all" || packageStatus(item) === status;
    const matchesService = service === "all" || (service === "none" ? item.appointment_type_id === null : item.appointment_type_id === service);
    const start = new Date(`${item.start_date}T00:00:00`);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - (period === "30" ? 30 : period === "90" ? 90 : 365));
    const matchesPeriod = period === "all" || start >= cutoff;
    return matchesSearch && matchesStatus && matchesService && matchesPeriod;
  }), [packages, period, search, service, status]);
  const services = useMemo(() => Array.from(new Map((packages ?? []).filter((item) => item.appointment_type).map((item) => [item.appointment_type_id, item.appointment_type])).values()), [packages]);

  return (
    <AppShell title="Pacotes" description="Sessões contratadas, utilização e renovação" action={<Button className="gap-2" onClick={() => { setRenewFrom(undefined); setDialogOpen(true); }}><Plus className="size-4" /><span className="hidden sm:inline">Novo pacote</span></Button>}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_180px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por paciente" aria-label="Buscar por paciente" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filtrar por situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="ativo">Ativos</SelectItem><SelectItem value="renovacao">Próximos da renovação</SelectItem><SelectItem value="esgotado">Esgotados</SelectItem><SelectItem value="expirado">Expirados</SelectItem><SelectItem value="encerrado">Encerrados</SelectItem><SelectItem value="cancelado">Cancelados</SelectItem></SelectContent></Select>
        <Select value={service} onValueChange={setService}><SelectTrigger aria-label="Filtrar por serviço"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os serviços</SelectItem><SelectItem value="none">Sem serviço definido</SelectItem>{services.map((item) => item ? <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem> : null)}</SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Filtrar por período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo o período</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="365">Último ano</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map((item) => <PackageCard key={item.id} item={item} onRenew={(source) => { setRenewFrom(source); setDialogOpen(true); }} />)}</div> : <div className="surface p-8 text-center"><p className="text-sm text-muted-foreground">Nenhum pacote encontrado.</p><Button className="mt-4" onClick={() => setDialogOpen(true)}>Criar pacote</Button></div>}
      <PackageDialog open={dialogOpen} onOpenChange={setDialogOpen} renewFrom={renewFrom} onSaved={(id) => navigate({ to: "/pacotes/$id", params: { id } })} />
    </AppShell>
  );
}