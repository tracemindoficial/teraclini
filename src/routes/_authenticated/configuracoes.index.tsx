import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, useProfileSpecialties, useSetProfileSpecialties, useSpecialties, useUpdateProfile } from "@/lib/data";
import { type CareMode } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({
    meta: [
      { title: "Meu Perfil Profissional — TeraClini" },
      { name: "description", content: "Dados e preferências do seu espaço profissional." },
      { property: "og:title", content: "Meu Perfil Profissional — TeraClini" },
      { property: "og:description", content: "Dados e preferências do seu espaço profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const saveSpecialties = useSetProfileSpecialties();
  const { data: specialties = [] } = useSpecialties(true);
  const { data: selectedSpecialties = [] } = useProfileSpecialties();
  const [values, setValues] = useState({
    full_name: "",
    specialty_ids: [] as string[],
    primary_specialty_id: "",
    professional_registry: "",
    city: "",
    state: "",
    care_mode: "ambos" as CareMode,
  });

  useEffect(() => {
    if (!profile) return;
    const linked = selectedSpecialties as Array<{ specialty_id: string; is_primary: boolean }>;
    setValues({
      full_name: profile.full_name ?? "",
      specialty_ids: linked.map((item) => item.specialty_id),
      primary_specialty_id: linked.find((item) => item.is_primary)?.specialty_id ?? linked[0]?.specialty_id ?? "",
      professional_registry: profile.professional_registry ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      care_mode: profile.care_mode ?? "ambos",
    });
  }, [profile, selectedSpecialties]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({
        full_name: values.full_name,
        professional_registry: values.professional_registry || null,
        city: values.city || null,
        state: values.state || null,
        care_mode: values.care_mode,
      });
      const primaryId = values.primary_specialty_id || values.specialty_ids[0];
      if (profile && primaryId) await saveSpecialties.mutateAsync({ profileId: profile.id, specialtyIds: values.specialty_ids, primaryId });
      toast.success("Dados atualizados.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  return (
    <AppShell title="Configurações" description="Seus dados profissionais" action={<Button asChild variant="outline"><Link to="/configuracoes/cadastros-basicos" className="gap-2"><BookOpenCheck className="size-4"/><span className="hidden sm:inline">Cadastros Básicos</span></Link></Button>}>
      <form onSubmit={handleSubmit} className="surface max-w-xl space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={values.full_name}
            onChange={(event) => setValues({ ...values, full_name: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Especialidade principal</Label>
          <Select value={values.primary_specialty_id} onValueChange={(primary_specialty_id) => setValues({ ...values, primary_specialty_id, specialty_ids: values.specialty_ids.includes(primary_specialty_id) ? values.specialty_ids : [...values.specialty_ids, primary_specialty_id] })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{specialties.map((specialty) => <SelectItem key={specialty.id} value={specialty.id}>{specialty.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2"><Label>Minhas especialidades</Label><div className="grid gap-2 sm:grid-cols-2">{specialties.map((specialty) => <label key={specialty.id} className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={values.specialty_ids.includes(specialty.id)} onChange={(event) => setValues({ ...values, specialty_ids: event.target.checked ? [...values.specialty_ids, specialty.id] : values.specialty_ids.filter((id) => id !== specialty.id), primary_specialty_id: !event.target.checked && values.primary_specialty_id === specialty.id ? "" : values.primary_specialty_id })}/>{specialty.name}</label>)}</div></div>
        <div className="space-y-1.5">
          <Label>Registro profissional</Label>
          <Input
            value={values.professional_registry}
            onChange={(event) =>
              setValues({ ...values, professional_registry: event.target.value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input
              value={values.city}
              onChange={(event) => setValues({ ...values, city: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Input
              value={values.state}
              onChange={(event) => setValues({ ...values, state: event.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Como você atende</Label>
          <Select
            value={values.care_mode}
            onValueChange={(value) => setValues({ ...values, care_mode: value as CareMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="ambos">Presencial e online</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={updateProfile.isPending || saveSpecialties.isPending}>
          Salvar
        </Button>
      </form>
    </AppShell>
  );
}
