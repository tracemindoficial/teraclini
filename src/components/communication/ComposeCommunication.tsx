import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  communicationCategories, type CommunicationAudience, type CommunicationCategory,
  type CommunicationDraft, type CommunicationRecipient,
} from "@/lib/communication";
import { useCommunicationActions, useCommunicationRecipients } from "@/lib/data/communication";

const selectClass = "min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const audiences = {
  individual: "Um profissional",
  trial: "Grupo: profissionais em teste padrão",
  all: "Todos os profissionais ativos",
} satisfies Record<CommunicationAudience, string>;

export function ComposeCommunication({ onClose, seed }: {
  onClose: () => void;
  seed: { draft: CommunicationDraft; recipient: CommunicationRecipient | null } | null;
}) {
  const [audience, setAudience] = useState<CommunicationAudience>("individual");
  const [recipient, setRecipient] = useState<CommunicationRecipient | null>(seed?.recipient ?? null);
  const [subject, setSubject] = useState(seed?.draft.subject ?? "");
  const [category, setCategory] = useState<CommunicationCategory>(seed?.draft.category ?? "administrative");
  const [body, setBody] = useState(seed?.draft.body ?? "");
  const [priority, setPriority] = useState(seed?.draft.priority ?? false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const findingRecipient = audience === "individual" && !recipient && !preview;
  useEffect(() => {
    if (!findingRecipient) return;
    const timer = setTimeout(() => setRecipientSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [findingRecipient, search]);
  const searchReady = recipientSearch === search.trim();
  const recipients = useCommunicationRecipients(recipientSearch, findingRecipient && searchReady);
  const { send } = useCommunicationActions(true);
  const sending = useRef(false);
  const last = useRef<{ signature: string; request: string } | null>(null);
  const draft = { audience, recipient: audience === "individual" ? recipient?.id ?? null : null, subject: subject.trim(), category, priority, body: body.trim() };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current || !draft.subject || !draft.body || (audience === "individual" && !recipient)) return;
    if (!preview) { setPreview(true); return; }
    const signature = JSON.stringify(draft);
    const attempt = last.current?.signature === signature ? last.current : { signature, request: crypto.randomUUID() };
    last.current = attempt;
    sending.current = true;
    setError("");
    try {
      const count = await send.mutateAsync({ draft, request: attempt.request });
      toast.success(`Mensagem entregue a ${count} ${count === 1 ? "profissional" : "profissionais"}.`);
      onClose();
    } catch (err) {
      const validation = err as { code?: string; message?: string };
      setError(validation.code === "22023" && validation.message ? validation.message : "Não foi possível confirmar o envio. Tente novamente sem editar para evitar duplicidade.");
    } finally { sending.current = false; }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Use este canal para comunicações administrativas. Não inclua dados de pacientes, prontuários ou informações clínicas.</p>
      {preview ? (
        <div className="space-y-3 rounded-xl border bg-muted/50 p-4">
          <p className="text-sm"><strong>Para:</strong> {audience === "individual" ? recipient?.full_name : audiences[audience]}</p>
          {audience !== "individual" && <p className="text-sm text-muted-foreground">Cada profissional receberá uma conversa privada. Os destinatários serão selecionados no momento do envio.</p>}
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">{communicationCategories[category]}</Badge>{priority && <Badge className="bg-warning text-warning-foreground">Prioritária</Badge>}</div>
          <p className="break-words font-semibold">{draft.subject}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{draft.body}</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5"><Label htmlFor="communication-audience">Destinatário</Label>
            <select id="communication-audience" className={selectClass} value={audience} disabled={Boolean(seed)} onChange={(e) => setAudience(e.target.value as CommunicationAudience)}>
              {Object.entries(audiences).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {audience === "individual" && (recipient ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"><strong>{recipient.full_name}</strong>{!seed && <Button type="button" variant="ghost" size="sm" onClick={() => setRecipient(null)}>Trocar</Button>}</div>
          ) : (
            <div className="space-y-2"><Label htmlFor="communication-recipient">Buscar profissional ativo</Label>
              <Input id="communication-recipient" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={160} placeholder="Nome do profissional" />
              <div className="max-h-32 overflow-y-auto rounded-lg border p-1">
                {!searchReady || recipients.isFetching ? <p className="p-2 text-sm text-muted-foreground">Buscando…</p> : recipients.isError ? <Button type="button" variant="ghost" onClick={() => void recipients.refetch()}>Erro na busca. Tentar novamente</Button> : recipients.data?.length ? recipients.data.map((person) => <Button key={person.id} type="button" variant="ghost" className="w-full justify-start" onClick={() => setRecipient(person)}>{person.full_name}</Button>) : <p className="p-2 text-sm text-muted-foreground">Nenhum profissional encontrado.</p>}
              </div>
            </div>
          ))}
          <div className="space-y-1.5"><Label htmlFor="communication-subject">Assunto</Label><Input id="communication-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={160} /></div>
          <div className="space-y-1.5"><Label htmlFor="communication-category">Categoria</Label>
            <select id="communication-category" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as CommunicationCategory)}>{Object.entries(communicationCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="communication-body">Mensagem</Label><Textarea id="communication-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} required maxLength={8000} /></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} className="size-4 accent-primary" /> Marcar como prioritária</label>
        </>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {preview && <Button type="button" variant="outline" disabled={send.isPending} onClick={() => { setPreview(false); setError(""); }}>Editar</Button>}
        <Button type="submit" disabled={send.isPending || !draft.subject || !draft.body || (audience === "individual" && !recipient)}>
          {preview ? <Send className="size-4" /> : <Eye className="size-4" />}{send.isPending ? "Enviando…" : preview ? "Confirmar envio" : "Visualizar prévia"}
        </Button>
      </div>
    </form>
  );
}
