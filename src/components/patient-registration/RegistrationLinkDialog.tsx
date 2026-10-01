import { useState } from "react";
import { toast } from "sonner";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPatientRegistrationLink } from "@/lib/patient-registration.functions";

export function RegistrationLinkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
 const [days, setDays] = useState("7"); const [label, setLabel] = useState(""); const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false);
 const create = async () => { setBusy(true); try { const result = await createPatientRegistrationLink({ data: { daysValid: Number(days), label } }); const next = `${window.location.origin}/pre-cadastro/${result.token}`; setUrl(next); await navigator.clipboard.writeText(next); toast.success("Link criado e copiado."); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível criar o link."); } finally { setBusy(false); } };
 const copy = async () => { await navigator.clipboard.writeText(url); toast.success("Link copiado."); };
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Link de pré-cadastro</DialogTitle><DialogDescription>O link é exclusivo do seu espaço profissional e expira automaticamente.</DialogDescription></DialogHeader>{url ? <div className="space-y-4"><div className="rounded-xl bg-secondary/35 p-4"><p className="text-sm font-medium">Link pronto para compartilhar</p><p className="mt-2 break-all text-xs text-muted-foreground">{url}</p></div><Button className="w-full gap-2" onClick={copy}><Copy className="size-4" /> Copiar link</Button></div> : <div className="space-y-4"><FormField id="link-label" label="Identificação" optional><Input id="link-label" placeholder="Ex.: indicação de setembro" value={label} onChange={(e) => setLabel(e.target.value)} /></FormField><FormField label="Validade"><Select value={days} onValueChange={setDays}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 dia</SelectItem><SelectItem value="7">7 dias</SelectItem><SelectItem value="14">14 dias</SelectItem><SelectItem value="30">30 dias</SelectItem></SelectContent></Select></FormField><Button className="w-full gap-2" disabled={busy} onClick={create}><Link2 className="size-4" /> {busy ? "Criando..." : "Criar e copiar link"}</Button></div>}</DialogContent></Dialog>;
}
