import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminSupportActions,
  useAdminSupportTicket,
  useAdminSupportTickets,
} from "@/lib/data/admin-support";
import type { SupportStatus } from "@/lib/data/support";

export const Route = createFileRoute("/_admin/admin/suporte")({
  validateSearch: z.object({ ticket: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Suporte — Administração TeraClini" },
      { name: "description", content: "Gestão de chamados do TeraClini." },
      { property: "og:title", content: "Suporte — Administração TeraClini" },
      { property: "og:description", content: "Gestão de chamados do TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSupportPage,
});
function AdminSupportPage() {
  const navigate = Route.useNavigate();
  const ticket = Route.useSearch({ select: (search) => search.ticket });
  const [selected, setSelected] = useState<string | null>(ticket ?? null);
  const [reply, setReply] = useState("");
  const list = useAdminSupportTickets();
  const detail = useAdminSupportTicket(selected);
  const actions = useAdminSupportActions(selected ?? "");
  async function send(event: FormEvent) {
    event.preventDefault();
    try {
      await actions.reply.mutateAsync(reply.trim());
      setReply("");
      toast.success("Resposta enviada.");
    } catch {
      toast.error("Não foi possível responder.");
    }
  }
  return (
    <AdminShell
      title="Suporte"
      description="Chamados técnicos e administrativos, sem conteúdo clínico"
    >
      {list.isLoading ? (
        <AdminState kind="loading">Carregando chamados...</AdminState>
      ) : list.error ? (
        <AdminState kind="error">Não foi possível carregar os chamados.</AdminState>
      ) : !list.data?.length ? (
        <AdminState>Nenhum chamado registrado.</AdminState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
          <div className="surface divide-y overflow-hidden">
            {list.data.map((ticket) => (
              <Button
                key={ticket.id}
                variant="ghost"
                className="h-auto w-full justify-start rounded-none p-4 text-left"
                onClick={() => {
                  setSelected(ticket.id);
                  void navigate({ to: ".", search: { ticket: ticket.id }, replace: true });
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{ticket.subject}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ticket.professionalName} ·{" "}
                    {new Date(ticket.last_message_at).toLocaleString("pt-BR")}
                  </span>
                </span>
                <SupportStatusBadge status={ticket.status} />
              </Button>
            ))}
          </div>
          <div className="surface min-h-80 p-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Selecione um chamado.</p>
            ) : detail.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando conversa...</p>
            ) : !detail.data ? (
              <p className="text-sm text-destructive">Chamado indisponível.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <h2 className="font-semibold">{detail.data.ticket.subject}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={detail.data.ticket.priority}
                      onValueChange={(priority) => actions.triage.mutate({ priority: priority as "low" | "normal" | "high" | "urgent", assignedToMe: Boolean(detail.data.ticket.assigned_admin_user_id) })}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem><SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={detail.data.ticket.status}
                      onValueChange={(value) => actions.status.mutate(value as SupportStatus)}
                    >
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem><SelectItem value="in_progress">Em atendimento</SelectItem>
                        <SelectItem value="waiting_user">Aguardando usuário</SelectItem><SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => actions.triage.mutate({ priority: detail.data.ticket.priority as "low" | "normal" | "high" | "urgent", assignedToMe: !detail.data.ticket.assigned_admin_user_id })}>
                      {detail.data.ticket.assigned_admin_user_id ? "Liberar chamado" : "Assumir chamado"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 py-5">
                  {detail.data.messages.map((item) => (
                    <article
                      key={item.id}
                      className={
                        item.author_type === "admin"
                          ? "ml-auto max-w-[88%] rounded-lg bg-primary/10 p-3"
                          : "max-w-[88%] rounded-lg bg-muted p-3"
                      }
                    >
                      <p className="text-xs font-semibold">
                        {item.author_type === "admin" ? "Equipe TeraClini" : "Profissional"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{item.message}</p>
                      <time className="mt-2 block text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </time>
                    </article>
                  ))}
                </div>
                {detail.data.ticket.status !== "resolved" && detail.data.ticket.status !== "closed" ? (
                  <form onSubmit={send} className="border-t pt-4">
                    <Textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Responder ao profissional"
                      maxLength={4000}
                      required
                    />
                    <Button
                      type="submit"
                      className="mt-3"
                      disabled={!reply.trim() || actions.reply.isPending}
                    >
                      Enviar resposta
                    </Button>
                  </form>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
