import { useDeferredValue, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Mail, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ComposeCommunication } from "./ComposeCommunication";
import { CommunicationThread } from "./CommunicationThread";
import { communicationPageSize, communicationSendKey, useCommunicationList } from "@/lib/data/communication";
import {
  communicationCategories, communicationStatus, formatCommunicationDate,
  type CommunicationConversation, type CommunicationDraft, type CommunicationFilter, type CommunicationRecipient,
} from "@/lib/communication";
import { cn } from "@/lib/utils";

const filters: { key: CommunicationFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "waiting", label: "Aguardando nossa resposta" },
  { key: "unread", label: "Não lidas" },
  { key: "priority", label: "Prioritárias" },
  { key: "archived", label: "Arquivadas" },
];

type Seed = { draft: CommunicationDraft; recipient: CommunicationRecipient | null };

export function CommunicationCenter({ admin = false }: { admin?: boolean }) {
  const [filter, setFilter] = useState<CommunicationFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CommunicationConversation | null>(null);
  const [compose, setCompose] = useState(false);
  const [seed, setSeed] = useState<Seed | null>(null);
  const sending = useIsMutating({ mutationKey: communicationSendKey }) > 0;
  const deferredSearch = useDeferredValue(search.trim());
  const list = useCommunicationList(admin, filter, deferredSearch, page, true);
  const rows = list.data?.slice(0, communicationPageSize) ?? [];

  function newMessage() {
    setSeed(null);
    setCompose(true);
  }

  return (
    <div className="space-y-5">
      <section className="surface flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Mail className="size-5" /></span>
          <div><h2 className="font-display font-semibold">{admin ? "Caixa de conversas" : "Suas conversas"}</h2>
            <p className="text-sm text-muted-foreground">{admin ? "Envie comunicados e acompanhe as respostas e a leitura de cada profissional." : "Leia os comunicados do TeraClini e responda à administração por aqui."}</p></div>
        </div>
        {admin && <Button onClick={newMessage}><Plus className="size-4" />Nova mensagem</Button>}
      </section>

      <section className="surface space-y-4 p-4 sm:p-5" aria-label="Lista de conversas">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" maxLength={160} aria-label={admin ? "Buscar por profissional ou assunto" : "Buscar por assunto"} placeholder={admin ? "Buscar por profissional ou assunto" : "Buscar por assunto"} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
        <div className="flex flex-wrap gap-2" aria-label="Filtros de conversas">
          {filters.filter((item) => admin || (item.key !== "waiting" && item.key !== "archived")).map((item) => (
            <Button key={item.key} size="sm" variant={filter === item.key ? "secondary" : "outline"} aria-pressed={filter === item.key} onClick={() => { setFilter(item.key); setPage(0); }}>{item.label}</Button>
          ))}
        </div>
        {list.isError ? <div className="space-y-2 py-4"><p role="alert" className="text-sm text-destructive">Não foi possível carregar suas conversas.</p><Button variant="outline" onClick={() => void list.refetch()}>Tentar novamente</Button></div> : list.isPending ? <p role="status" className="py-6 text-sm text-muted-foreground">Carregando conversas…</p> : !rows.length ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p> : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => setSelected(row)} className={cn("w-full rounded-lg border px-3 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring sm:px-4", row.unread ? "border-primary/30 bg-secondary/20" : "bg-card")}>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-muted-foreground">
                    <span>{admin ? row.professional_name : "Administração TeraClini"}</span>
                    <time dateTime={row.last_message_at}>{formatCommunicationDate(row.last_message_at)}</time>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={cn("min-w-0 break-words text-sm", row.unread ? "font-bold" : "font-semibold")}>{row.subject}</span>
                    <Badge variant="outline">{communicationCategories[row.category]}</Badge>
                    {row.priority && <Badge className="bg-warning/30 text-foreground">Prioritária</Badge>}
                    {row.unread > 0 ? <Badge variant="secondary">{row.unread} {row.unread === 1 ? "não lida" : "não lidas"}</Badge> : !admin && <Badge variant="outline">Lida</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{!admin && row.unread > 0 ? "Abra a conversa para ler a mensagem." : row.last_body}</p>
                  {!admin && <p className="mt-2 text-xs text-muted-foreground">Enviada em <time dateTime={row.created_at}>{formatCommunicationDate(row.created_at)}</time></p>}
                  {(admin || row.status === "archived") && <p className={cn("text-xs text-muted-foreground", admin && "mt-2")}>{communicationStatus[row.status]}
                    {admin && <> · {row.initial_read_at ? `Comunicado lido em ${formatCommunicationDate(row.initial_read_at)}` : "Comunicado entregue, ainda não lido"}{row.audience !== "individual" && <> · {row.audience === "all" ? "Envio geral" : "Grupo em teste"}</>}</>}
                  </p>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {(page > 0 || (list.data?.length ?? 0) > communicationPageSize) && <div className="flex items-center justify-end gap-2"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="size-4" /></Button><span className="text-sm text-muted-foreground">Página {page + 1}</span><Button variant="outline" size="icon" aria-label="Próxima página" disabled={(list.data?.length ?? 0) <= communicationPageSize} onClick={() => setPage((current) => current + 1)}><ChevronRight className="size-4" /></Button></div>}
      </section>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
          {selected && <><DialogHeader><DialogTitle className="break-words pr-6">{selected.subject}</DialogTitle><DialogDescription>{admin ? selected.professional_name : "Administração TeraClini"} · Enviada em {formatCommunicationDate(selected.created_at)}</DialogDescription></DialogHeader>
            <CommunicationThread key={selected.id} conversation={selected} admin={admin} onResend={(message) => {
              if (!selected.recipient_id) return;
              setSeed({ draft: { audience: "individual", recipient: selected.recipient_id, subject: selected.subject, category: selected.category, priority: selected.priority, body: message.body }, recipient: { id: selected.recipient_id, full_name: selected.professional_name } });
              setSelected(null);
              setCompose(true);
            }} />
          </>}
        </DialogContent>
      </Dialog>
      {admin && <Dialog open={compose} onOpenChange={(open) => { if (open || !sending) setCompose(open); }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{seed ? "Reenviar mensagem" : "Nova mensagem"}</DialogTitle><DialogDescription>{seed ? "Confira o texto e o destinatário. O reenvio cria uma nova conversa." : "Revise a mensagem e confirme o envio."}</DialogDescription></DialogHeader>
          <ComposeCommunication seed={seed} onClose={() => { setCompose(false); setFilter("all"); setSearch(""); setPage(0); }} />
        </DialogContent>
      </Dialog>}
    </div>
  );
}
