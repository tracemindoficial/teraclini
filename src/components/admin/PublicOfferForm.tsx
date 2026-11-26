import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateAdminPublicOffer } from "@/lib/data/admin";

function parsePrice(value: string) {
  const match = /^(\d{1,8})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return NaN;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

function editPrice(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function PublicOfferForm({
  plan,
}: {
  plan: { price_cents: number; reference_price_cents: number | null; is_active: boolean };
}) {
  const [price, setPrice] = useState(() => editPrice(plan.price_cents));
  const [reference, setReference] = useState(() =>
    plan.reference_price_cents === null ? "" : editPrice(plan.reference_price_cents),
  );
  const [isActive, setIsActive] = useState(plan.is_active);
  const save = useUpdateAdminPublicOffer();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceCents = parsePrice(price);
    const referencePriceCents = reference.trim() ? parsePrice(reference) : null;
    const valid = (amount: number) => Number.isInteger(amount) && amount > 0 && amount <= 2_147_483_647;
    if (!valid(priceCents)) {
      toast.error("Informe um valor mensal válido, maior que zero.");
      return;
    }
    if (referencePriceCents !== null && (!valid(referencePriceCents) || referencePriceCents <= priceCents)) {
      toast.error("O preço anterior deve ser maior que o valor mensal, ou ficar em branco.");
      return;
    }
    if (!window.confirm("Confirma a alteração da oferta pública e das condições de novos contratos?")) return;
    try {
      await save.mutateAsync({ priceCents, referencePriceCents, isActive, confirm: true });
      toast.success("Oferta pública atualizada.");
    } catch {
      toast.error("Não foi possível atualizar a oferta pública.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 border-t pt-4">
      <h3 className="font-semibold">Editar oferta pública</h3>
      <p className="text-sm text-muted-foreground">
        O valor mensal vale para novas contratações. O preço anterior é apenas exibido no site e não altera contratos existentes.
      </p>
      <fieldset disabled={save.isPending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="offer-price">Valor mensal (R$)</Label>
            <Input id="offer-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-reference">Preço anterior (R$, opcional)</Label>
            <Input id="offer-reference" inputMode="decimal" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="offer-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="offer-active">Disponível no site e para novas contratações</Label>
        </div>
        <Button type="submit" disabled={save.isPending}>Salvar oferta</Button>
      </fieldset>
    </form>
  );
}
