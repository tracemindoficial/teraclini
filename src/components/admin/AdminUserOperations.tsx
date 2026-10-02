import { useEffect, useState } from "react";
import { KeyRound, LogOut, Mail, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUserOperations } from "@/lib/data/admin-operations";

export interface AdminUserEditableData {
  id: string; email: string; name: string; profession: string | null; professionalRegistry: string | null;
  city: string | null; state: string | null; careMode: "presencial" | "online" | "ambos" | null;
}
export function AdminUserOperations({ user }: { user: AdminUserEditableData }) {
  const operations = useAdminUserOperations(user.id);
  const [profileOpen, setProfileOpen] = useState(false); const [emailOpen, setEmailOpen] = useState(false);
  const [profile, setProfile] = useState({ fullName: user.name, profession: user.profession ?? "", professionalRegistry: user.professionalRegistry ?? "", city: user.city ?? "", state: user.state ?? "", careMode: user.careMode ?? "" });
  const [email, setEmail] = useState(user.email);
  useEffect(() => setEmail(user.email), [user.email]);
  const run = async (action: () => Promise<unknown>, success: string) => { try { await action(); toast.success(success); } catch (error) { toast.error(error instanceof Error ? error.message : "A operação não pôde ser concluída."); } };
  return (
    <section className="surface mt-6 p-5">
      <div><h2 className="font-semibold">Cadastro e acesso</h2><p className="mt-1 text-sm text-muted-foreground">Operações sensíveis exigem confirmação e ficam registradas.</p></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Button variant="outline" className="justify-start gap-2" onClick={() => setProfileOpen(true)}><Pencil className="size-4" />Editar cadastro</Button>
        <Button variant="outline" className="justify-start gap-2" onClick={() => setEmailOpen(true)}><Mail className="size-4" />Alterar e-mail</Button>
        <Button variant="outline" className="justify-start gap-2" disabled={operations.sendReset.isPending} onClick={() => window.confirm("Enviar um link de redefinição de senha?") && run(() => operations.sendReset.mutateAsync(), "Link de redefinição enviado.")}><KeyRound className="size-4" />Enviar redefinição</Button>
        <Button variant="outline" className="justify-start gap-2" disabled={operations.resendAccess.isPending} onClick={() => window.confirm("Reenviar as instruções de acesso?") && run(() => operations.resendAccess.mutateAsync(), "Instruções reenviadas.")}><Mail className="size-4" />Reenviar acesso</Button>
        <Button variant="outline" className="justify-start gap-2" disabled={operations.forceReset.isPending} onClick={() => window.confirm("Exigir redefinição antes do próximo acesso?") && run(() => operations.forceReset.mutateAsync(), "Redefinição obrigatória ativada.")}><ShieldAlert className="size-4" />Exigir nova senha</Button>
        <Button variant="destructive" className="justify-start gap-2" disabled={operations.revokeSessions.isPending} onClick={() => window.confirm("Encerrar todas as sessões ativas desta conta?") && run(() => operations.revokeSessions.mutateAsync(), "Sessões encerradas.")}><LogOut className="size-4" />Encerrar sessões</Button>
      </div>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}><DialogContent><DialogHeader><DialogTitle>Editar cadastro</DialogTitle><DialogDescription>Altere apenas dados administrativos informados pelo profissional.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2"><Input className="sm:col-span-2" aria-label="Nome completo" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} placeholder="Nome completo" /><Input aria-label="Profissão" value={profile.profession} onChange={(e) => setProfile({ ...profile, profession: e.target.value })} placeholder="Profissão" /><Input aria-label="Registro profissional" value={profile.professionalRegistry} onChange={(e) => setProfile({ ...profile, professionalRegistry: e.target.value })} placeholder="Registro profissional" /><Input aria-label="Cidade" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Cidade" /><Input aria-label="Estado" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} placeholder="Estado" /><Select value={profile.careMode || "unset"} onValueChange={(value) => setProfile({ ...profile, careMode: value === "unset" ? "" : value as typeof profile.careMode })}><SelectTrigger className="sm:col-span-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">Modalidade não informada</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="ambos">Presencial e online</SelectItem></SelectContent></Select></div>
        <DialogFooter><Button variant="outline" onClick={() => setProfileOpen(false)}>Cancelar</Button><Button disabled={operations.updateProfile.isPending || profile.fullName.trim().length < 2} onClick={() => run(() => operations.updateProfile.mutateAsync({ userId: user.id, fullName: profile.fullName, profession: profile.profession || null, professionalRegistry: profile.professionalRegistry || null, city: profile.city || null, state: profile.state || null, careMode: (profile.careMode || null) as "presencial" | "online" | "ambos" | null, confirm: true }), "Cadastro atualizado.").then(() => setProfileOpen(false))}>Salvar</Button></DialogFooter>
      </DialogContent></Dialog>
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}><DialogContent><DialogHeader><DialogTitle>Alterar e-mail</DialogTitle><DialogDescription>O novo endereço será usado no próximo acesso.</DialogDescription></DialogHeader><Input type="email" aria-label="Novo e-mail" value={email} onChange={(e) => setEmail(e.target.value)} /><DialogFooter><Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button><Button disabled={operations.updateEmail.isPending || !email.includes("@")} onClick={() => run(() => operations.updateEmail.mutateAsync({ userId: user.id, email, confirm: true }), "E-mail atualizado.").then(() => setEmailOpen(false))}>Confirmar alteração</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
