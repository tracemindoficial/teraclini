import { useState, type FormEvent } from "react";
import { MessageCirclePlus, Send } from "lucide-react";
import { toast } from "sonner";

import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSupportTicket,
  useReplySupportTicket,
  useSupportTicket,
  useSupportTickets,
} from "@/lib/data/support";

export function SupportPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const tickets = useSupportTickets();
  const detail = useSupportTicket(selectedId);
  const createTicket = useCreateSupportTicket();
  const replyTicket = useReplySupportTicket(selectedId ?? "");

  async function submitTicket(event: FormEvent) {
    event.preventDefault();
    try {
      const id = await createTicket.mutateAsync({
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject("");
      setMessage("");
      setCreateOpen(false);
      setSelectedId(id);
      toast.success("Chamado criado.");
    } catch {
      toast.error("Não foi possível criar o chamado.");
    }
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    try {
      await replyTicket.mutateAsync(reply.trim());
      setReply("");
      toast.success("Mensagem enviada.");
    } catch {
      toast.error("Não foi possível enviar a mensagem.");
    }
  }

  return (
    <div className="space-y-5">
      <Alert>
        <AlertTitle>Suporte técnico e administrativo</AlertTitle>
        <AlertDescription>
          Não informe nomes de pacientes, dados de prontuário ou qualquer conteúdo clínico.
        </AlertDescription>
      </Alert>
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <MessageCirclePlus className="size-4" /> Novo chamado
        </Button>
      </div>
      {tickets.isLoading ? (
        <p className="surface p-6 text-sm text-muted-foreground">Carregando chamados...</p>
      ) : tickets.error ? (
        <p className="surface p-6 text-sm text-destructive">
          Não foi possível carregar os chamados.
        </p>
      ) : !tickets.data?.length ? (
        <div className="surface p-8 text-center">
          <h2 className="font-semibold">Nenhum chamado aberto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use o suporte quando precisar de ajuda com sua conta ou com o sistema.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.4fr)]">
          <div className="surface divide-y overflow-hidden">
            {tickets.data.map((ticket) => (
              <Button
                key={ticket.id}
                variant="ghost"
                onClick={() => setSelectedId(ticket.id)}
                className="h-auto w-full justify-start rounded-none px-4 py-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{ticket.subject}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {new Date(ticket.last_message_at).toLocaleString("pt-BR")}
                  </span>
                </span>
                <SupportStatusBadge status={ticket.status} />
              </Button>
            ))}
          </div>
          <div className="surface min-h-72 p-5">
            {!selectedId ? (
              <p className="text-sm text-muted-foreground">
                Selecione um chamado para ver a conversa.
              </p>
            ) : detail.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando conversa...</p>
            ) : !detail.data ? (
              <p className="text-sm text-destructive">Chamado indisponível.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="font-semibold">{detail.data.ticket.subject}</h2>
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(detail.data.ticket.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <SupportStatusBadge status={detail.data.ticket.status} />
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
                        {item.author_type === "admin" ? "Equipe TeraClini" : "Você"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{item.message}</p>
                      <time className="mt-2 block text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </time>
                    </article>
                  ))}
                </div>
                {detail.data.ticket.status !== "resolved" && detail.data.ticket.status !== "closed" ? (
                  <form onSubmit={submitReply} className="border-t pt-4">
                    <Label htmlFor="support-reply">Responder</Label>
                    <Textarea
                      id="support-reply"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={4000}
                      required
                      className="mt-2 min-h-24"
                    />
                    <Button
                      type="submit"
                      className="mt-3 gap-2"
                      disabled={replyTicket.isPending || !reply.trim()}
                    >
                      <Send className="size-4" /> Enviar
                    </Button>
                  </form>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo chamado</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitTicket} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Assunto</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                minLength={3}
                maxLength={160}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-message">Como podemos ajudar?</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={4000}
                required
                className="min-h-32"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Não inclua dados clínicos ou informações de pacientes.
            </p>
            <Button type="submit" className="w-full" disabled={createTicket.isPending}>
              Criar chamado
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
