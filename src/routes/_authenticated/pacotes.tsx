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
  const filtered = useMemo(() => (packages ?? []).filter((item) => {
    const matchesSearch = item.patient.full_name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"));
    return matchesSearch && (status === "all" || packageStatus(item) === status);
  }), [packages, search, status]);

  return (
    <AppShell title="Pacotes" description="Sessões contratadas, utilização e renovação" action={<Button className="gap-2" onClick={() => { setRenewFrom(undefined); setDialogOpen(true); }}><Plus className="size-4" /><span className="hidden sm:inline">Novo pacote</span></Button>}>
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por paciente" aria-label="Buscar por paciente" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filtrar por situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="ativo">Ativos</SelectItem><SelectItem value="renovacao">Próximos da renovação</SelectItem><SelectItem value="esgotado">Esgotados</SelectItem><SelectItem value="expirado">Expirados</SelectItem><SelectItem value="encerrado">Encerrados</SelectItem><SelectItem value="cancelado">Cancelados</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map((item) => <PackageCard key={item.id} item={item} onRenew={(source) => { setRenewFrom(source); setDialogOpen(true); }} />)}</div> : <div className="surface p-8 text-center"><p className="text-sm text-muted-foreground">Nenhum pacote encontrado.</p><Button className="mt-4" onClick={() => setDialogOpen(true)}>Criar pacote</Button></div>}
      <PackageDialog open={dialogOpen} onOpenChange={setDialogOpen} renewFrom={renewFrom} onSaved={(id) => navigate({ to: "/pacotes/$id", params: { id } })} />
    </AppShell>
  );
}