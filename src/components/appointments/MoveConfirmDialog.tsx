import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { localParts } from "@/lib/agenda-rules";

type Pending = { patient: string; from: string; to: string; minutes: number };

function fmt(value: string, timeZone: string) {
  const { date, time } = localParts(value, timeZone);
  return { date: new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }), time };
}

export function MoveConfirmDialog({ pending, timeZone, saving, onCancel, onConfirm }: {
  pending: Pending | undefined;
  timeZone: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const from = pending ? fmt(pending.from, timeZone) : undefined;
  const to = pending ? fmt(pending.to, timeZone) : undefined;
  const end = pending ? localParts(new Date(Date.parse(pending.to) + pending.minutes * 60_000), timeZone).time : "";
  return <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirmar alteração do agendamento?</AlertDialogTitle>
        <AlertDialogDescription>Você está alterando o horário de um agendamento existente. Nenhum novo atendimento será criado e os demais dados permanecem iguais.</AlertDialogDescription>
      </AlertDialogHeader>
      {pending && from && to ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Paciente</dt><dd className="font-medium">{pending.patient}</dd>
        <dt className="text-muted-foreground">Original</dt><dd className="capitalize">{from.date} · {from.time}</dd>
        <dt className="text-muted-foreground">Novo</dt><dd className="font-semibold capitalize text-primary">{to.date} · {to.time}–{end}</dd>
        <dt className="text-muted-foreground">Duração</dt><dd>{pending.minutes} minutos</dd>
      </dl> : null}
      <AlertDialogFooter>
        <Button variant="outline" disabled={saving} onClick={onCancel}>Cancelar</Button>
        <Button disabled={saving} onClick={onConfirm}>{saving ? <Loader2 className="animate-spin" /> : null}Confirmar alteração</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
