import { Link, useNavigate } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { PendingClientDeletions } from "@/components/admin/PendingClientDeletions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brlFromCents } from "@/lib/admin-metrics";
import { useInviteAdminUser } from "@/lib/data/admin-operations";
import { useProfessionalDirectory, type ProfessionalFilters } from "@/lib/data/professional-admin";
import type { ProfessionalCounts, ProfessionalRow } from "@/lib/professional-admin.functions";
import {
  ACCESS_LABELS,
  FINANCIAL_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  dueLabel,
  formatDateBR,
  remainingLabel,
  type ProfessionalStatus,
} from "@/lib/professional-status";
import { cn } from "@/lib/utils";

const INDICATORS: { key: keyof ProfessionalCounts; label: string; apply: Partial<ProfessionalFilters>; group: "people" | "finance" }[] = [
  { key: "total", label: "Profissionais cadastrados", apply: { status: "all" }, group: "people" },
  { key: "incomplete", label: "Cadastros incompletos", apply: { status: "incomplete" }, group: "people" },
  { key: "with_access", label: "Com acesso ativo", apply: { status: "with_access" }, group: "people" },
  { key: "trial", label: "Degustações em andamento", apply: { status: "trial_any" }, group: "people" },
  { key: "trial_ending", label: "Degustações terminando (2 dias)", apply: { status: "trial_ending" }, group: "people" },
  { key: "trial_expired", label: "Degustações expiradas sem contratação", apply: { status: "trial_expired" }, group: "people" },
  { key: "active", label: "Assinaturas pagas ativas", apply: { status: "active" }, group: "people" },
  { key: "suspended", label: "Acessos suspensos", apply: { status: "suspended" }, group: "people" },
  { key: "payment_pending", label: "Pagamentos pendentes", apply: { financial: "pending" }, group: "finance" },
  { key: "overdue", label: "Faturas vencidas", apply: { financial: "overdue" }, group: "finance" },
];

const DEFAULTS: ProfessionalFilters = {
  search: "", status: "all", access: "all", financial: "all", from: null, to: null, sort: "newest", page: 1,
};

function StatusBadge({ status }: { status: ProfessionalStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone === "good" && "border-primary/30 bg-primary/10 text-primary",
        tone === "warn" && "border-accent bg-accent text-accent-foreground",
        tone === "bad" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function activityLabel(row: ProfessionalRow) {
  return row.info.last_activity_at ? formatDateBR(row.info.last_activity_at) : "Nenhuma atividade registrada";
}

function amountLabel(row: ProfessionalRow) {
  return row.info.next_amount_cents == null ? "—" : brlFromCents(row.info.next_amount_cents);
}

export function ProfessionalsCentral() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<ProfessionalFilters>(DEFAULTS);
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [searchText]);
  const update = (patch: Partial<ProfessionalFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const { data, isLoading, error, isFetching } = useProfessionalDirectory(filters);
  const [inviteOpen, setInviteOpen] = useState(false);

  const open = (row: ProfessionalRow) => navigate({ to: "/admin/profissionais/$id", params: { id: row.user_id } });

  return (
    <AdminShell
      title="Profissionais e Assinaturas"
      description="Cadastro, degustação, assinatura e pagamentos de cada profissional"
      action={
        <Button className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Adicionar profissional</span>
        </Button>
      }
    >
      <PendingClientDeletions />
      {data ? (
        <div className="mb-5 space-y-3">
          {(["people", "finance"] as const).map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {group === "people" ? "Profissionais (cada pessoa conta uma vez)" : "Financeiro"}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                {INDICATORS.filter((i) => i.group === group).map((i) => {
                  const active = Object.entries(i.apply).every(([k, v]) => filters[k as keyof ProfessionalFilters] === v) && i.key !== "total";
                  return (
                    <button
                      key={i.key}
                      type="button"
                      onClick={() => update({ status: "all", financial: "all", ...i.apply })}
                      className={cn("surface p-3 text-left transition-colors hover:border-primary/50", active && "border-primary ring-1 ring-primary")}
                    >
                      <p className="font-display text-2xl font-semibold">{data.counts[i.key]}</p>
                      <p className="text-xs leading-tight text-muted-foreground">{i.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="surface mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="relative sm:col-span-2 lg:col-span-6">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" aria-label="Buscar profissional" />
        </label>
        <Select value={filters.status} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="with_access">Com acesso ativo</SelectItem>
            <SelectItem value="trial_any">Degustação em andamento</SelectItem>
            {(Object.keys(STATUS_LABELS) as ProfessionalStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.access} onValueChange={(v) => update({ access: v })}>
          <SelectTrigger aria-label="Tipo de acesso"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os acessos</SelectItem>
            {Object.entries(ACCESS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.financial} onValueChange={(v) => update({ financial: v })}>
          <SelectTrigger aria-label="Situação financeira"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda situação financeira</SelectItem>
            {Object.entries(FINANCIAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" aria-label="Cadastro a partir de" value={filters.from ?? ""} onChange={(e) => update({ from: e.target.value || null })} />
        <Input type="date" aria-label="Cadastro até" value={filters.to ?? ""} onChange={(e) => update({ to: e.target.value || null })} />
        <Select value={filters.sort} onValueChange={(v) => update({ sort: v as ProfessionalFilters["sort"] })}>
          <SelectTrigger aria-label="Ordenação"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Cadastro mais recente</SelectItem>
            <SelectItem value="oldest">Cadastro mais antigo</SelectItem>
            <SelectItem value="last_activity">Última atividade</SelectItem>
            <SelectItem value="access_end">Fim da degustação</SelectItem>
            <SelectItem value="next_due">Próximo vencimento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <AdminState kind="loading">Carregando profissionais...</AdminState>
      ) : error ? (
        <AdminState kind="error">{error instanceof Error ? error.message : "Não foi possível carregar os profissionais."}</AdminState>
      ) : !data?.rows.length ? (
        <AdminState>Nenhum profissional corresponde aos filtros.</AdminState>
      ) : (
        <div className={cn(isFetching && "opacity-70 transition-opacity")}>
          <div className="surface hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {["Profissional", "E-mail", "Cadastro", "Última atividade", "Status principal", "Tipo de acesso", "Tempo restante", "Próxima cobrança", "Valor", "Situação financeira", "Ações"].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.account_id} className="cursor-pointer border-b last:border-0 hover:bg-muted/40" onClick={() => open(row)}>
                    <td className="px-3 py-3 font-medium">{row.full_name || "Nome não registrado"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.email ?? "—"}</td>
                    <td className="px-3 py-3">{formatDateBR(row.created_at)}</td>
                    <td className="px-3 py-3 text-xs">{activityLabel(row)}</td>
                    <td className="px-3 py-3"><StatusBadge status={row.info.status} /></td>
                    <td className="px-3 py-3 text-xs">{ACCESS_LABELS[row.info.access_type]}</td>
                    <td className="px-3 py-3 text-xs">{remainingLabel(row.info)}</td>
                    <td className="px-3 py-3 text-xs">{row.info.next_due_on ? `${formatDateBR(row.info.next_due_on)} · ${dueLabel(row.info)}` : "Sem cobrança configurada"}</td>
                    <td className="px-3 py-3">{amountLabel(row)}</td>
                    <td className="px-3 py-3 text-xs">{FINANCIAL_LABELS[row.info.financial]}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/profissionais/$id" params={{ id: row.user_id }} preload="intent">Ver detalhes</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 lg:hidden">
            {data.rows.map((row) => (
              <li key={row.account_id}>
                <Link to="/admin/profissionais/$id" params={{ id: row.user_id }} className="surface block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.full_name || "Nome não registrado"}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.email ?? "—"}</p>
                    </div>
                    <StatusBadge status={row.info.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Acesso</dt><dd>{ACCESS_LABELS[row.info.access_type]}</dd>
                    <dt className="text-muted-foreground">Prazo</dt><dd>{remainingLabel(row.info)}</dd>
                    <dt className="text-muted-foreground">Cobrança</dt><dd>{dueLabel(row.info)}</dd>
                    <dt className="text-muted-foreground">Valor</dt><dd>{amountLabel(row)}</dd>
                    <dt className="text-muted-foreground">Atividade</dt><dd>{activityLabel(row)}</dd>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{data.total} profissional{data.total === 1 ? "" : "is"}</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={filters.page === 1} onClick={() => update({ page: filters.page - 1 })}>Anterior</Button>
              <Button variant="outline" disabled={filters.page * data.page_size >= data.total} onClick={() => update({ page: filters.page + 1 })}>Próxima</Button>
            </div>
          </div>
        </div>
      )}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </AdminShell>
  );
}

type InviteRole = "professional" | "support_admin" | "analyst" | "finance_admin" | "content_admin";

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const inviteUser = useInviteAdminUser();
  const empty = { fullName: "", email: "", phone: "", role: "professional" as InviteRole };
  const [invite, setInvite] = useState(empty);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar profissional</DialogTitle>
          <DialogDescription>Um convite seguro será enviado para a pessoa definir o próprio acesso.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input aria-label="Nome completo" placeholder="Nome completo" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
          <Input aria-label="E-mail" type="email" placeholder="E-mail" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <Input aria-label="Telefone" placeholder="Telefone (opcional)" value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} />
          <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v as InviteRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Profissional</SelectItem>
              <SelectItem value="support_admin">Suporte</SelectItem>
              <SelectItem value="analyst">Analista</SelectItem>
              <SelectItem value="finance_admin">Financeiro</SelectItem>
              <SelectItem value="content_admin">Conteúdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={inviteUser.isPending || invite.fullName.trim().length < 2 || !invite.email.includes("@")}
            onClick={async () => {
              try {
                await inviteUser.mutateAsync({ fullName: invite.fullName, email: invite.email, phone: invite.phone || null, role: invite.role, confirm: true });
                toast.success("Convite enviado.");
                onOpenChange(false);
                setInvite(empty);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Não foi possível enviar o convite.");
              }
            }}
          >
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
