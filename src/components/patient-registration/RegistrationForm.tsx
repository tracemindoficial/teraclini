import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { CompletePatientFields } from "@/components/patients/CompletePatientFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_REGISTRATION, registrationPayloadSchema, type RegistrationFormValues, type RegistrationPayload } from "@/lib/patient-registration-schema";
import { submitPatientRegistration } from "@/lib/patient-registration.functions";

const STEPS = ["Identificação", "Endereço", "Contatos", "Sua busca", "Histórico", "Revisão"];
const OPTIONS = { yesNoPrivate: [["sim", "Sim"], ["nao", "Não"], ["prefiro_nao_informar", "Prefiro não informar"]] } as const;

export function RegistrationForm({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const form = useForm<RegistrationFormValues, unknown, RegistrationPayload>({ resolver: zodResolver(registrationPayloadSchema), defaultValues: EMPTY_REGISTRATION });
  const { handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = form;
  const values = watch();
  const next = async () => {
    const fields: (keyof RegistrationFormValues)[][] = [
      ["full_name", "email", "birth_date", "cpf", "age_group"],
      ["postal_code", "city", "state"],
      values.age_group === "adulto" ? [] : ["guardian_name"],
      values.previous_therapy === "sim" ? ["therapy_reason", "previous_therapy", "previous_therapy_details"] : ["therapy_reason", "previous_therapy"],
      ["medical_diagnosis", "medication_use", "family_mental_health"],
    ];
    if (await trigger(fields[step] ?? [])) setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };
  const back = () => setStep((value) => Math.max(value - 1, 0));
  const submit = handleSubmit(async (payload) => { setSubmitError(""); try { await submitPatientRegistration({ data: { token, payload } }); setSent(true); } catch (error) { setSubmitError(error instanceof Error ? error.message : "Não foi possível enviar o cadastro."); } });

  if (sent) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-xl text-center"><BrandLogo className="mx-auto w-44" /><div className="surface mt-10 p-8"><CheckCircle2 className="mx-auto size-12 text-primary" /><h1 className="mt-4 text-2xl font-semibold">Cadastro enviado com segurança</h1><p className="mt-3 text-muted-foreground">O profissional recebeu seus dados para revisão. O envio não cria acesso ao sistema nem confirma atendimento.</p></div></div></main>;

  return <main className="min-h-screen bg-background px-4 py-6 sm:py-10"><div className="mx-auto max-w-3xl"><header className="text-center"><BrandLogo className="mx-auto w-40 sm:w-48" /><h1 className="mt-6 text-2xl font-semibold sm:text-3xl">Pré-cadastro de paciente</h1><p className="mt-2 text-sm text-muted-foreground">Preencha no seu ritmo. Campos sensíveis podem ser deixados sem resposta quando indicado.</p></header><div className="surface mt-6 overflow-hidden"><div className="border-b p-5"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Etapa {step + 1} de {STEPS.length}</span><span>{STEPS[step]}</span></div><Progress value={((step + 1) / STEPS.length) * 100} /></div><FormProvider {...form}><form onSubmit={submit} className="p-5 sm:p-7"><CompletePatientFields step={step} /><div className="grid gap-5 sm:grid-cols-2">
    {step === 5 && <><div className="sm:col-span-2 rounded-xl bg-secondary/35 p-5"><h2 className="font-semibold">Revise antes de enviar</h2><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Nome</dt><dd>{values.full_name || "—"}</dd></div><div><dt className="text-muted-foreground">E-mail</dt><dd>{values.email || "—"}</dd></div><div><dt className="text-muted-foreground">Nascimento</dt><dd>{values.birth_date || "—"}</dd></div><div><dt className="text-muted-foreground">Cidade/UF</dt><dd>{values.city || "—"}{values.state ? `/${values.state}` : ""}</dd></div></dl></div><div className="sm:col-span-2 flex items-start gap-3 rounded-xl border p-4"><Checkbox id="privacy_consent" checked={values.privacy_consent} onCheckedChange={(checked) => setValue("privacy_consent", checked === true, { shouldValidate: true })} /><div><label htmlFor="privacy_consent" className="text-sm font-medium">Li o aviso de privacidade e autorizo o envio destes dados ao profissional.</label><p className="mt-1 text-xs text-muted-foreground">As informações serão usadas para análise do pré-cadastro. O envio não cria uma conta e não substitui avaliação profissional. <Link to="/privacidade" target="_blank" className="font-medium text-primary underline underline-offset-2">Leia o aviso completo</Link>.</p>{errors.privacy_consent?.message && <p className="mt-1 text-xs text-destructive">{errors.privacy_consent.message}</p>}</div></div></>}
  </div>{submitError && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p>}<div className="mt-7 flex items-center justify-between gap-3"><Button type="button" variant="outline" onClick={back} disabled={step === 0 || isSubmitting}><ChevronLeft className="size-4" /> Voltar</Button>{step < STEPS.length - 1 ? <Button type="button" onClick={next}>Continuar <ChevronRight className="size-4" /></Button> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar pré-cadastro"}</Button>}</div></form></FormProvider></div><p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Seus dados são enviados por conexão protegida.</p></div></main>;
}
