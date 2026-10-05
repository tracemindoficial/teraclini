import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Pencil, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CompletePatientFields } from "@/components/patients/CompletePatientFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type RegistrationRequest,
  useApproveRegistration,
  useRegistrationDuplicates,
  useRegistrationRequest,
  useRejectRegistration,
  useSaveRegistrationRequest,
} from "@/lib/data/patient-registration";
import { completePatientSchema, type CompletePatientPayload, type RegistrationFormValues } from "@/lib/patient-registration-schema";

export const Route = createFileRoute("/_authenticated/pacientes/pre-cadastros/$id")({
  head: () => ({
    meta: [
      { title: "Revisar pré-cadastro — TeraClini" },
      {
        name: "description",
        content: "Revise e aprove dados protegidos de uma solicitação de pré-cadastro.",
      },
      { property: "og:title", content: "Revisar pré-cadastro — TeraClini" },
      {
        property: "og:description",
        content: "Revise e aprove dados protegidos de uma solicitação de pré-cadastro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const {
    data: request,
    isLoading,
    error: requestError,
    refetch: refetchRequest,
    isFetching: isFetchingRequest,
  } = useRegistrationRequest(id);
  const { data: duplicates } = useRegistrationDuplicates(id);
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const save = useSaveRegistrationRequest();
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  if (isLoading)
    return (
      <AppShell title="Revisar pré-cadastro">
        <p className="text-sm text-muted-foreground">Carregando dados protegidos...</p>
      </AppShell>
    );
  if (requestError || !request)
    return (
      <AppShell title="Revisar pré-cadastro">
        <div className="surface mx-auto max-w-xl p-6 text-center">
          <p className="font-medium">Não foi possível carregar este pré-cadastro.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua permissão e tente novamente.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            disabled={isFetchingRequest}
            onClick={() => void refetchRequest()}
          >
            {isFetchingRequest ? "Tentando novamente..." : "Tentar novamente"}
          </Button>
        </div>
      </AppShell>
    );
  const pending = request.status === "awaiting_approval";
  const approveNow = (existingPatientId?: string) =>
    approve.mutate(existingPatientId ? { id, existingPatientId } : { id }, {
      onSuccess: (approvedPatientId) => {
        toast.success(
          existingPatientId
            ? "Pré-cadastro aprovado e vinculado ao paciente."
            : "Pré-cadastro aprovado e paciente criado.",
        );
        navigate({
          to: "/pacientes/$id",
          params: { id: approvedPatientId },
          search: { schedule: true },
        });
      },
      onError: (e) => toast.error(e.message),
    });
  return (
    <AppShell
      title="Revisar pré-cadastro"
      description="Dados visíveis apenas no seu espaço profissional"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-xl font-semibold">{request.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              Enviado em {new Date(request.submitted_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <Badge>
            {request.status === "awaiting_approval"
              ? "Aguardando aprovação"
              : request.status === "approved"
                ? "Aprovado"
                : "Recusado"}
          </Badge>
        </div>
        {pending && duplicates && duplicates.length > 0 && (
          <section className="rounded-xl border border-accent/40 bg-accent/10 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-accent" />
              <div>
                <h2 className="font-semibold">Possível cadastro existente</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Não haverá mesclagem automática. Revise e escolha se deseja vincular.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {duplicates.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Coincidência: {item.reasons.join(", ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approve.isPending}
                    onClick={() => approveNow(item.id)}
                  >
                    Vincular e aprovar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="surface p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Dados informados</h2>
            {pending ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" /> Editar
              </Button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Detail label="Nome" value={request.full_name} />
            <Detail label="CPF" value={request.cpf} />
            <Detail
              label="Nascimento"
              value={new Date(`${request.birth_date}T12:00:00`).toLocaleDateString("pt-BR")}
            />
            <Detail label="E-mail" value={request.email} />
            <Detail label="Telefone" value={request.phone} />
            <Detail
              label="Endereço"
              value={[
                request.street,
                request.address_number,
                request.neighborhood,
                request.city,
                request.state,
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <Detail label="Motivo da busca" value={request.therapy_reason} wide />
            <Detail
              label="Terapia anterior"
              value={answer(request.previous_therapy, request.previous_therapy_details)}
              wide
            />
            <Detail
              label="Diagnóstico comunicado"
              value={answer(request.medical_diagnosis, request.medical_diagnosis_details)}
              wide
            />
            <Detail
              label="Uso de medicamentos"
              value={answer(request.medication_use, request.medication_details)}
              wide
            />
            <Detail
              label="Histórico familiar"
              value={answer(request.family_mental_health, request.family_mental_health_details)}
              wide
            />
            {request.guardian_name && (
              <Detail
                label="Responsável"
                value={`${request.guardian_name}${request.guardian_relationship ? ` · ${request.guardian_relationship}` : ""}`}
                wide
              />
            )}
          </div>
        </section>
        {pending && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="gap-2 text-destructive"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="size-4" /> Recusar
            </Button>
            <Button className="gap-2" disabled={approve.isPending} onClick={() => approveNow()}>
              <CheckCircle2 className="size-4" />
              {approve.isPending ? "Aprovando..." : "Aprovar como novo paciente"}
            </Button>
          </div>
        )}
      </div>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar solicitação</DialogTitle>
            <DialogDescription>
              O paciente não será adicionado ao cadastro oficial.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Motivo interno da recusa"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || reject.isPending}
              onClick={() =>
                reject.mutate(
                  { id, reason },
                  {
                    onSuccess: () => {
                      toast.success("Solicitação recusada.");
                      setRejectOpen(false);
                      navigate({ to: "/pacientes/pre-cadastros" });
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Corrigir dados do pré-cadastro</DialogTitle>
            <DialogDescription>
              Revise os dados informados antes de aprovar. A solicitação continuará pendente.
            </DialogDescription>
          </DialogHeader>
          <RegistrationRequestEditor
            request={request}
            pending={save.isPending}
            onCancel={() => setEditOpen(false)}
            onSave={async (values) => {
              try {
                await save.mutateAsync({ id, values });
                toast.success("Dados do pré-cadastro atualizados.");
                setEditOpen(false);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível atualizar os dados do pré-cadastro.",
                );
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function RegistrationRequestEditor({
  request,
  pending,
  onCancel,
  onSave,
}: {
  request: RegistrationRequest;
  pending: boolean;
  onCancel: () => void;
  onSave: (values: CompletePatientPayload) => Promise<void>;
}) {
  const form = useForm<RegistrationFormValues, unknown, CompletePatientPayload>({
    resolver: zodResolver(completePatientSchema),
    defaultValues: {
    full_name: request.full_name,
    email: request.email,
    cpf: request.cpf,
    birth_date: request.birth_date,
    phone: request.phone ?? "",
    city: request.city,
    state: request.state,
    therapy_reason: request.therapy_reason,
    age_group: request.age_group,
    postal_code: request.postal_code,
    street: request.street ?? "",
    address_number: request.address_number ?? "",
    address_complement: request.address_complement ?? "",
    neighborhood: request.neighborhood ?? "",
    gender: request.gender ?? "",
    marital_status: request.marital_status ?? "",
    education: request.education ?? "",
    occupation: request.occupation ?? "",
    guardian_name: request.guardian_name ?? "",
    guardian_relationship: request.guardian_relationship ?? "",
    guardian_phone: request.guardian_phone ?? "",
    guardian_email: request.guardian_email ?? "",
    emergency_name: request.emergency_name ?? "",
    emergency_relationship: request.emergency_relationship ?? "",
    emergency_phone: request.emergency_phone ?? "",
    emergency_notes: request.emergency_notes ?? "",
    previous_therapy: request.previous_therapy,
    previous_therapy_details: request.previous_therapy_details ?? "",
    medical_diagnosis: request.medical_diagnosis,
    medical_diagnosis_details: request.medical_diagnosis_details ?? "",
    medication_use: request.medication_use,
    medication_details: request.medication_details ?? "",
    family_mental_health: request.family_mental_health,
    family_mental_health_details: request.family_mental_health_details ?? "",
    payment_preference: request.payment_preference ?? "",
    referral_source: request.referral_source ?? "",
    referral_source_other: request.referral_source_other ?? "",
    privacy_consent: true,
    },
  });
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      full_name: request.full_name,
      email: request.email,
      cpf: request.cpf,
      birth_date: request.birth_date,
    });
  }, [form, request]);
  return (
    <FormProvider {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSave)}>
        <CompletePatientFields />
        <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar correções"}
        </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}
function Detail({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value || "Não informado"}</p>
    </div>
  );
}
function answer(value: string, details: string | null) {
  const labels: Record<string, string> = {
    sim: "Sim",
    nao: "Não",
    nao_sei: "Não sei",
    prefiro_nao_informar: "Preferiu não informar",
  };
  return `${labels[value] ?? value}${details ? ` — ${details}` : ""}`;
}
