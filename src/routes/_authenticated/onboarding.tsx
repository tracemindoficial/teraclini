import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSetProfileSpecialties, useSpecialties, useUpdateProfile } from "@/lib/data";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Primeiro acesso — TeraClini" },
      { name: "description", content: "Configure seu espaço profissional individual." },
      { property: "og:title", content: "Primeiro acesso — TeraClini" },
      { property: "og:description", content: "Configure seu espaço profissional individual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

type OnboardingValues = {
  full_name: string;
  profession: string;
  professional_registry: string;
  city: string;
  state: string;
};

const EMPTY_VALUES: OnboardingValues = {
  full_name: "",
  profession: "",
  professional_registry: "",
  city: "",
  state: "",
};

function Onboarding() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const saveSpecialties = useSetProfileSpecialties();
  const { data: specialties = [] } = useSpecialties(true);
  const navigate = useNavigate();
  const hydrated = useRef(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || hydrated.current) return;
    const specialty = specialties.find((item) => item.name === profile.profession);
    setValues({
      full_name: profile.full_name ?? "",
      profession: specialty?.id ?? "",
      professional_registry: profile.professional_registry ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
    });
    hydrated.current = true;
  }, [profile, specialties]);

  function validationError() {
    if (values.full_name.trim().length < 2) return "Informe seu nome.";
    if (!values.profession) return "Selecione sua profissão.";
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (updateProfile.isPending) return;
    const invalid = validationError();
    setFormError(invalid);
    if (invalid) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const metadata = authData.user?.user_metadata as
        { avatar_url?: unknown; picture?: unknown } | undefined;
      const avatarCandidate = metadata?.avatar_url ?? metadata?.picture;
      const avatarUrl = typeof avatarCandidate === "string" ? avatarCandidate : profile?.avatar_url;
      await updateProfile.mutateAsync({
        full_name: values.full_name.trim(),
        profession: specialties.find((item) => item.id === values.profession)?.name ?? null,
        professional_registry: values.professional_registry.trim() || null,
        city: values.city.trim() || null,
        state: values.state.trim().toUpperCase() || null,
        avatar_url: avatarUrl || null,
        onboarding_completed: true,
      });
      if (profile) await saveSpecialties.mutateAsync({ profileId: profile.id, specialtyIds: [values.profession], primaryId: values.profession });
      toast.success("Seu espaço profissional está pronto.");
      navigate({ to: "/meu-dia", replace: true });
    } catch (error) {
      console.error("[onboarding]", {
        step: "save_profile",
        outcome: "failure",
        code: error instanceof Error ? error.name : "unknown",
      });
      setFormError("Não conseguimos salvar seus dados. Tente novamente.");
      toast.error("Não conseguimos salvar seus dados.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-8 sm:py-12">
      <BrandLogo className="mb-7 w-56 max-w-[72vw]" />
      <p className="text-sm font-medium text-primary">Bem-vindo</p>
      <section className="surface mt-3 p-5 sm:p-7">
        <h1 className="text-2xl">Vamos configurar seu espaço profissional</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Para começar, precisamos apenas do seu nome e da sua profissão.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <FormField id="full-name" label="Seu nome" required>
            <Input
              id="full-name"
              value={values.full_name}
              onChange={(event) => setValues({ ...values, full_name: event.target.value })}
              autoComplete="name"
              disabled={isLoading || updateProfile.isPending}
              aria-invalid={Boolean(formError && values.full_name.trim().length < 2)}
            />
          </FormField>

          <FormField id="profession" label="Profissão" required>
            <Select
              value={values.profession}
              onValueChange={(profession) => setValues({ ...values, profession })}
              disabled={isLoading || updateProfile.isPending}
            >
              <SelectTrigger id="profession" aria-label="Profissão">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((profession) => (
                  <SelectItem key={profession.id} value={profession.id}>
                    {profession.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="professional-registry" label="Registro profissional" optional>
            <Input
              id="professional-registry"
              value={values.professional_registry}
              onChange={(event) =>
                setValues({ ...values, professional_registry: event.target.value })
              }
              disabled={updateProfile.isPending}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="city" label="Cidade" optional>
              <Input
                id="city"
                value={values.city}
                onChange={(event) => setValues({ ...values, city: event.target.value })}
                autoComplete="address-level2"
                disabled={updateProfile.isPending}
              />
            </FormField>
            <FormField id="state" label="Estado" optional>
              <Input
                id="state"
                value={values.state}
                onChange={(event) => setValues({ ...values, state: event.target.value })}
                autoComplete="address-level1"
                maxLength={30}
                disabled={updateProfile.isPending}
              />
            </FormField>
          </div>

          {formError ? (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <p>{formError}</p>
              {formError.includes("Não conseguimos") ? (
                <Button type="submit" variant="link" className="mt-1 h-auto p-0 text-destructive">
                  Tentar novamente
                </Button>
              ) : null}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isLoading || updateProfile.isPending}
            aria-busy={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Salvando..." : "Continuar para Meu Dia"}
          </Button>
        </form>
      </section>
    </main>
  );
}
