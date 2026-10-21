import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToReais, reaisToCents } from "@/lib/basic-registrations";
import { useAttendancePricing, useSaveAttendancePricing } from "@/lib/data";

const fmt = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function AttendancePricingCard() {
  const { data } = useAttendancePricing();
  const save = useSaveAttendancePricing();
  const [single, setSingle] = useState("180,00");
  const [pkg, setPkg] = useState("680,00");
  const [qty, setQty] = useState("4");
  useEffect(() => { if (data) { setSingle(fmt(data.single_session_cents)); setPkg(fmt(data.package_total_cents)); setQty(String(data.package_quantity)); } }, [data]);
  const pkgCents = reaisToCents(pkg);
  const q = Number(qty);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const s = reaisToCents(single);
    if (s === null || s < 0 || pkgCents === null || pkgCents < 0 || !Number.isInteger(q) || q < 2) return toast.error("Revise os valores informados.");
    try { await save.mutateAsync({ single_session_cents: s, package_total_cents: pkgCents, package_quantity: q }); toast.success("Valores de atendimento salvos."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }
  return (
    <form onSubmit={submit} className="surface mb-5 space-y-4 p-4">
      <div><h2 className="font-semibold">Valores de Atendimento</h2><p className="text-sm text-muted-foreground">Preenchidos automaticamente em novos agendamentos. Contratações já feitas mantêm o valor combinado.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="price-single">Sessão avulsa (R$)</Label><Input id="price-single" inputMode="decimal" value={single} onChange={(e) => setSingle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="price-package">Pacote — valor total (R$)</Label><Input id="price-package" inputMode="decimal" value={pkg} onChange={(e) => setPkg(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="price-qty">Sessões do pacote</Label><Input id="price-qty" type="number" min={2} max={52} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
      </div>
      {pkgCents !== null && q > 0 ? <p className="text-xs text-muted-foreground">Referência por sessão no pacote: {centsToReais(Math.round(pkgCents / q))}</p> : null}
      <div className="flex justify-end"><Button type="submit" disabled={save.isPending}>Salvar valores</Button></div>
    </form>
  );
}
