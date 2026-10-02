import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Pencil, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type RegistrationRequest,
  useApproveRegistration,
  useRegistrationDuplicates,
  useRegistrationRequest,
  useRejectRegistration,
  useSaveRegistrationRequest,
} from "@/lib/data/patient-registration";

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
  const { data: request, isLoading } = useRegistrationRequest(id);
  const { data: duplicates } = useRegistrationDuplicates(id);
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const save = useSaveRegistrationRequest();
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  if (isLoading || !request)
    return (
      <AppShell title="Revisar pré-cadastro">
        <p className="text-sm text-muted-foreground">Carregando dados protegidos...</p>
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
              <CheckCircle2 className="size-4" /> Aprovar como novo paciente
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
  onSave: (values: {
    full_name: string;
    email: string;
    cpf: string;
    birth_date: string;
    phone: string | null;
    city: string;
    state: string;
    therapy_reason: string;
    age_group: RegistrationRequest["age_group"];
    postal_code: string;
    street: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    gender: string | null;
    occupation: string | null;
    guardian_name: string | null;
    guardian_relationship: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
    emergency_name: string | null;
    emergency_relationship: string | null;
    emergency_phone: string | null;
    emergency_notes: string | null;
    previous_therapy: string;
    previous_therapy_details: string | null;
    medical_diagnosis: string;
    medical_diagnosis_details: string | null;
    medication_use: string;
    medication_details: string | null;
    family_mental_health: string;
    family_mental_health_details: string | null;
  }) => Promise<void>;
}) {
  const [values, setValues] = useState({
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
  });
  const valid =
    values.full_name.trim().length >= 2 &&
    values.email.includes("@") &&
    values.cpf.trim().length >= 11 &&
    Boolean(values.birth_date) &&
    values.postal_code.replace(/\D/g, "").length === 8 &&
    values.city.trim().length >= 2 &&
    values.state.trim().length >= 2 &&
    values.therapy_reason.trim().length >= 3 &&
    (values.age_group === "adulto" || values.guardian_name.trim().length >= 2);
  const nullable = (value: string) => value.trim() || null;
  const choiceOptions = [
    ["sim", "Sim"],
    ["nao", "Não"],
    ["prefiro_nao_informar", "Prefere não informar"],
  ] as const;
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          ...values,
          phone: nullable(values.phone),
          street: nullable(values.street),
          address_number: nullable(values.address_number),
          address_complement: nullable(values.address_complement),
          neighborhood: nullable(values.neighborhood),
          gender: nullable(values.gender),
          occupation: nullable(values.occupation),
          guardian_name: nullable(values.guardian_name),
          guardian_relationship: nullable(values.guardian_relationship),
          guardian_phone: nullable(values.guardian_phone),
          guardian_email: nullable(values.guardian_email),
          emergency_name: nullable(values.emergency_name),
          emergency_relationship: nullable(values.emergency_relationship),
          emergency_phone: nullable(values.emergency_phone),
          emergency_notes: nullable(values.emergency_notes),
          previous_therapy_details: nullable(values.previous_therapy_details),
          medical_diagnosis_details: nullable(values.medical_diagnosis_details),
          medication_details: nullable(values.medication_details),
          family_mental_health_details: nullable(values.family_mental_health_details),
        });
      }}
    >
      <Input
        className="sm:col-span-2"
        aria-label="Nome completo"
        value={values.full_name}
        onChange={(event) => setValues({ ...values, full_name: event.target.value })}
      />
      <Input
        type="email"
        aria-label="E-mail"
        value={values.email}
        onChange={(event) => setValues({ ...values, email: event.target.value })}
      />
      <Input
        aria-label="Telefone"
        value={values.phone}
        onChange={(event) => setValues({ ...values, phone: event.target.value })}
      />
      <Input
        aria-label="CPF"
        value={values.cpf}
        onChange={(event) => setValues({ ...values, cpf: event.target.value })}
      />
      <Select
        value={values.age_group}
        onValueChange={(age_group) =>
          setValues({ ...values, age_group: age_group as RegistrationRequest["age_group"] })
        }
      >
        <SelectTrigger aria-label="Faixa etária">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="crianca">Criança</SelectItem>
          <SelectItem value="adolescente">Adolescente</SelectItem>
          <SelectItem value="adulto">Adulto</SelectItem>
        </SelectContent>
      </Select>
      <Input
        aria-label="Gênero"
        value={values.gender}
        onChange={(event) => setValues({ ...values, gender: event.target.value })}
      />
      <Input
        aria-label="Profissão ou ocupação"
        value={values.occupation}
        onChange={(event) => setValues({ ...values, occupation: event.target.value })}
      />
      <Input
        type="date"
        aria-label="Data de nascimento"
        value={values.birth_date}
        onChange={(event) => setValues({ ...values, birth_date: event.target.value })}
      />
      <Input
        aria-label="CEP"
        value={values.postal_code}
        onChange={(event) => setValues({ ...values, postal_code: event.target.value })}
      />
      <Input
        aria-label="Logradouro"
        value={values.street}
        onChange={(event) => setValues({ ...values, street: event.target.value })}
      />
      <Input
        aria-label="Número"
        value={values.address_number}
        onChange={(event) => setValues({ ...values, address_number: event.target.value })}
      />
      <Input
        aria-label="Complemento"
        value={values.address_complement}
        onChange={(event) => setValues({ ...values, address_complement: event.target.value })}
      />
      <Input
        aria-label="Bairro"
        value={values.neighborhood}
        onChange={(event) => setValues({ ...values, neighborhood: event.target.value })}
      />
      <Input
        aria-label="Cidade"
        value={values.city}
        onChange={(event) => setValues({ ...values, city: event.target.value })}
      />
      <Input
        aria-label="Estado"
        value={values.state}
        onChange={(event) => setValues({ ...values, state: event.target.value })}
      />
      {values.age_group !== "adulto" ? (
        <>
          <Input
            aria-label="Nome do responsável"
            value={values.guardian_name}
            onChange={(event) => setValues({ ...values, guardian_name: event.target.value })}
          />
          <Input
            aria-label="Relação do responsável"
            value={values.guardian_relationship}
            onChange={(event) =>
              setValues({ ...values, guardian_relationship: event.target.value })
            }
          />
          <Input
            aria-label="Telefone do responsável"
            value={values.guardian_phone}
            onChange={(event) => setValues({ ...values, guardian_phone: event.target.value })}
          />
          <Input
            type="email"
            aria-label="E-mail do responsável"
            value={values.guardian_email}
            onChange={(event) => setValues({ ...values, guardian_email: event.target.value })}
          />
        </>
      ) : null}
      <Input
        aria-label="Contato de emergência"
        value={values.emergency_name}
        onChange={(event) => setValues({ ...values, emergency_name: event.target.value })}
      />
      <Input
        aria-label="Relação do contato de emergência"
        value={values.emergency_relationship}
        onChange={(event) => setValues({ ...values, emergency_relationship: event.target.value })}
      />
      <Input
        aria-label="Telefone de emergência"
        value={values.emergency_phone}
        onChange={(event) => setValues({ ...values, emergency_phone: event.target.value })}
      />
      <Input
        aria-label="Observações de emergência"
        value={values.emergency_notes}
        onChange={(event) => setValues({ ...values, emergency_notes: event.target.value })}
      />
      <div className="sm:col-span-2">
        <Textarea
          aria-label="Motivo da busca"
          value={values.therapy_reason}
          onChange={(event) => setValues({ ...values, therapy_reason: event.target.value })}
        />
      </div>
      {[
        ["previous_therapy", "Terapia anterior", choiceOptions],
        ["medical_diagnosis", "Diagnóstico comunicado", choiceOptions],
        ["medication_use", "Uso de medicamentos", choiceOptions],
        [
          "family_mental_health",
          "Histórico familiar",
          [...choiceOptions.slice(0, 2), ["nao_sei", "Não sabe"], choiceOptions[2]],
        ],
      ].map(([field, label, options]) => (
        <div key={field as string} className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
          <Select
            value={values[field as keyof typeof values] as string}
            onValueChange={(value) => setValues({ ...values, [field as string]: value })}
          >
            <SelectTrigger aria-label={label as string}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(options as readonly (readonly [string, string])[]).map(([key, text]) => (
                <SelectItem key={key} value={key}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            aria-label={`Detalhes: ${label as string}`}
            placeholder="Detalhes, quando aplicável"
            value={values[`${field as string}_details` as keyof typeof values] as string}
            onChange={(event) =>
              setValues({ ...values, [`${field as string}_details`]: event.target.value })
            }
          />
        </div>
      ))}
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid || pending}>
          Salvar correções
        </Button>
      </DialogFooter>
    </form>
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
