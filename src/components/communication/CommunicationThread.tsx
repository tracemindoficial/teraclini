import { useRef, useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, CornerUpRight, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  communicationCategories, formatCommunicationDate,
  type CommunicationConversation, type CommunicationMessage,
} from "@/lib/communication";
import { useCommunicationActions, useCommunicationThread } from "@/lib/data/communication";
import { cn } from "@/lib/utils";

export function CommunicationThread({ conversation, admin, onResend }: {
  conversation: CommunicationConversation;
  admin: boolean;
  onResend: (message: CommunicationMessage) => void;
}) {
  const thread = useCommunicationThread(conversation.id, admin);
  const { reply, archive } = useCommunicationActions(admin);
  const [body, setBody] = useState("");
  const sending = useRef(false);
  const last = useRef<{ body: string; request: string } | null>(null);
  const archived = thread.data?.archived ?? conversation.status === "archived";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (sending.current || !text || archived) return;
    const attempt = last.current?.body === text ? last.current : { body: text, request: crypto.randomUUID() };
    last.current = attempt;
    sending.current = true;
    try {
      await reply.mutateAsync({ id: conversation.id, body: text, request: attempt.request });
      setBody("");
      last.current = null;
      toast.success("Resposta enviada.");
    } catch (err) {
      const validation = err as { code?: string; message?: string };
      toast.error(validation.code === "22023" && validation.message ? validation.message : "Não foi possível confirmar a resposta. Tente novamente sem editar.");
    } finally { sending.current = false; }
  }

  async function toggleArchive() {
    try {
      await archive.mutateAsync({ id: conversation.id, archived: !archived });
      toast.success(archived ? "Conversa restaurada." : "Conversa arquivada. O histórico foi preservado.");
    } catch { toast.error("Não foi possível atualizar o arquivo da conversa."); }
  }

  if (thread.isError) return <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Não foi possível abrir a conversa.</p><Button variant="outline" onClick={() => void thread.refetch()}>Tentar novamente</Button></div>;
  if (!thread.data) return <p role="status" className="text-sm text-muted-foreground">Carregando conversa…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{communicationCategories[conversation.category]}</Badge>
        {conversation.priority && <Badge className="bg-warning text-warning-foreground">Prioritária</Badge>}
        {archived && <Badge variant="outline">Arquivada</Badge>}
        {admin && <Button size="sm" variant="outline" className="ml-auto" onClick={() => void toggleArchive()} disabled={archive.isPending || reply.isPending}>
          {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}{archived ? "Restaurar" : "Arquivar"}
        </Button>}
      </div>
      <ol className="space-y-3" aria-label="Histórico da conversa">
        {thread.data.messages.map((message) => (
          <li key={message.id} className={cn("min-w-0 rounded-lg border p-3 sm:p-4", message.author === "admin" ? "bg-secondary/20" : "bg-card")}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <strong>{message.author === "admin" ? "Administração TeraClini" : admin ? conversation.professional_name : "Você"}</strong>
              <time dateTime={message.created_at} className="text-muted-foreground">{formatCommunicationDate(message.created_at)}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p>
            {(admin || message.author === "professional") && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{message.read_at ? `Lida em ${formatCommunicationDate(message.read_at)}` : "Entregue · ainda não lida"}</span>
                {admin && message.author === "admin" && conversation.recipient_id && <Button size="sm" variant="ghost" type="button" disabled={archive.isPending || reply.isPending} onClick={() => onResend(message)}><CornerUpRight className="size-4" />Reenviar ao profissional</Button>}
              </div>
            )}
          </li>
        ))}
      </ol>
      {archived ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Histórico preservado. {admin ? "Restaure a conversa para voltar a responder." : "A administração precisa restaurar a conversa para que novas respostas sejam enviadas."}</p> : (
        <form onSubmit={submit} className="space-y-2 border-t pt-4">
          <Label htmlFor="communication-reply">Responder</Label>
          <Textarea id="communication-reply" value={body} rows={3} maxLength={8000} onChange={(event) => setBody(event.target.value)} readOnly={reply.isPending} placeholder="Escreva sua resposta…" />
          <p className="text-xs text-muted-foreground">Não inclua informações clínicas ou dados de pacientes.</p>
          <div className="flex justify-end"><Button type="submit" disabled={reply.isPending || archive.isPending || !body.trim()}><Send className="size-4" />{reply.isPending ? "Enviando…" : "Enviar resposta"}</Button></div>
        </form>
      )}
    </div>
  );
}
