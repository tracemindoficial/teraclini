import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { currency, moneyCents } from "@/lib/finance-rules";
import { useFinanceAction, type FinanceRow } from "@/lib/data/finance";
export const METHODS: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
};
export const STATUS: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  cancelled: "Cancelado",
  confirmed: "Confirmado",
  reversed: "Estornado",
};
export function ReceiptDialog({
  row,
  editing = false,
  onClose,
}: {
  row: FinanceRow;
  editing?: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(
    ((editing ? row.amount_cents : row.balance_cents) / 100).toFixed(2),
  );
  const [date, setDate] = useState(row.received_on ?? new Date().toLocaleDateString("en-CA"));
  const [method, setMethod] = useState(row.method ?? "pix");
  const [confirmed, setConfirmed] = useState(true);
  const [key] = useState(() => crypto.randomUUID());
  const mutation = useFinanceAction();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await mutation.mutateAsync({
        action: editing ? "edit" : "create",
        id: editing ? row.id : undefined,
        receivable_id: editing ? undefined : row.id,
        request_key: key,
        amount_cents: moneyCents(amount),
        received_on: date,
        method,
        confirmed,
      });
      toast.success(editing ? "Recebimento atualizado." : "Recebimento registrado.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar recebimento" : "Registrar recebimento"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {row.patient_name} · {row.service_name_snapshot}
        </p>
        {!editing && (
          <p className="text-sm">
            Saldo: <strong>{currency(row.balance_cents)}</strong>
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="receipt-amount">Valor (R$)</Label>
            <Input
              id="receipt-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="receipt-date">Data do recebimento</Label>
            <Input
              id="receipt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger aria-label="Forma de pagamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHODS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
              Confirmar recebimento
            </label>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar recebimento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
