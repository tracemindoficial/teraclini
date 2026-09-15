import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

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
import { PatientDialog } from "@/components/PatientDialog";
import { LOCATION_TYPES, PROFESSIONS, type CareMode, type LocationType } from "@/lib/domain";
import { useSaveLocation, useUpdateProfile, useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const CARE_MODES: { value: CareMode; label: string }[] = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "ambos", label: "Presencial e online" },
];

function Onboarding() {
  const [step, setStep] = useState(1);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const saveLocation = useSaveLocation();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    full_name: "",
    profession: "",
    professional_registry: "",
    city: "",
    state: "",
    care_mode: "ambos" as CareMode,
  });
  const [location, setLocation] = useState({
    name: "",
    type: "clinica" as LocationType,
    address: "",
  });

  async function finish() {
    try {
      await updateProfile.mutateAsync({
        full_name: values.full_name.trim() || profile?.full_name || "",
        profession: values.profession || null,
        professional_registry: values.professional_registry || null,
        city: values.city || null,
        state: values.state || null,
        care_mode: values.care_mode,
        onboarding_completed: true,
      });
      if (location.name.trim()) {
        await saveLocation.mutateAsync({
          name: location.name.trim(),
          type: location.type,
          address: location.address || null,
        });
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      return false;
    }
  }

  async function goToStep4() {
    if (await finish()) setStep(4);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10">
      <p className="text-sm font-medium text-primary">Etapa {step} de 4</p>

      {step === 1 ? (
        <Card
          title="Vamos configurar seu espaço profissional"
          onNext={() => setStep(2)}
          nextDisabled={!values.full_name.trim()}
        >
          <Field label="Seu nome">
            <Input
              value={values.full_name}
              onChange={(event) => setValues({ ...values, full_name: event.target.value })}
              placeholder={profile?.full_name ?? ""}
            />
          </Field>
          <Field label="Profissão">
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
          </Field>
          <Field label="Registro profissional (quando aplicável)">
            <Input
              value={values.professional_registry}
              onChange={(event) =>
                setValues({ ...values, professional_registry: event.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade">
              <Input
                value={values.city}
                onChange={(event) => setValues({ ...values, city: event.target.value })}
              />
            </Field>
            <Field label="Estado">
              <Input
                value={values.state}
                onChange={(event) => setValues({ ...values, state: event.target.value })}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title="Como você atende?" onBack={() => setStep(1)} onNext={() => setStep(3)}>
          <div className="grid gap-2">
            {CARE_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setValues({ ...values, care_mode: mode.value })}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                  values.care_mode === mode.value
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card
          title="Onde você atende?"
          description="Você pode cadastrar outros locais depois."
          onBack={() => setStep(2)}
          onNext={goToStep4}
          nextLabel="Continuar"
        >
          <Field label="Nome do local">
            <Input
              value={location.name}
              onChange={(event) => setLocation({ ...location, name: event.target.value })}
              placeholder="Clínica A, Consultório próprio, Online..."
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={location.type}
              onValueChange={(value) => setLocation({ ...location, type: value as LocationType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Endereço (opcional)">
            <Input
              value={location.address}
              onChange={(event) => setLocation({ ...location, address: event.target.value })}
            />
          </Field>
        </Card>
      ) : null}

      {step === 4 ? (
        <div className="surface mt-4 p-6">
          <h1 className="text-2xl">Tudo pronto!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você quer começar cadastrando seu primeiro paciente?
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setPatientDialogOpen(true)}>Cadastrar paciente</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/meu-dia" })}>
              Fazer isso depois
            </Button>
          </div>
        </div>
      ) : null}

      <PatientDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        onSaved={() => navigate({ to: "/meu-dia" })}
      />
    </div>
  );
}

function Card({
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="surface mt-4 p-6">
      <h1 className="text-2xl">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-6 space-y-4">{children}</div>
      <div className="mt-8 flex justify-between gap-2">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            Voltar
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
