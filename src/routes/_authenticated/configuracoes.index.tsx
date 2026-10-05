import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { useProfile, useUpdateProfile } from "@/lib/data";
import { PROFESSIONS, type CareMode } from "@/lib/domain";
import { joinProfession, splitProfession } from "@/lib/professional-profile";

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
  const [values, setValues] = useState({
    full_name: "",
    profession: "",
    professional_registry: "",
    city: "",
    state: "",
    care_mode: "ambos" as CareMode,
    other_profession: "",
  });

  useEffect(() => {
    if (!profile) return;
    const profession = splitProfession(profile.profession);
    setValues({
      full_name: profile.full_name ?? "",
      profession: profession.profession,
      professional_registry: profile.professional_registry ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      care_mode: profile.care_mode ?? "ambos",
      other_profession: profession.otherProfession,
    });
  }, [profile]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({
        full_name: values.full_name,
        profession: joinProfession(values.profession, values.other_profession) || null,
        professional_registry: values.professional_registry || null,
        city: values.city || null,
        state: values.state || null,
        care_mode: values.care_mode,
      });
      toast.success("Dados atualizados.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  return (
    <AppShell title="Configurações" description="Seus dados profissionais">
      <form onSubmit={handleSubmit} className="surface max-w-xl space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={values.full_name}
            onChange={(event) => setValues({ ...values, full_name: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Profissão</Label>
          <Select
            value={values.profession}
            onValueChange={(value) => setValues({ ...values, profession: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {PROFESSIONS.map((profession) => (
                <SelectItem key={profession} value={profession}>
                  {profession}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {values.profession === "Outra" ? (
          <div className="space-y-1.5">
            <Label htmlFor="other-profession">Qual é sua profissão?</Label>
            <Input
              id="other-profession"
              value={values.other_profession}
              onChange={(event) => setValues({ ...values, other_profession: event.target.value })}
              required
            />
          </div>
        ) : null}
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
        <Button type="submit" disabled={updateProfile.isPending}>
          Salvar
        </Button>
      </form>
    </AppShell>
  );
}
