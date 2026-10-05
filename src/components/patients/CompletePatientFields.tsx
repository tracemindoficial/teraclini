import { useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCpf,
  formatPhone,
  formatPostalCode,
  GENDER_OPTIONS,
  genderSelection,
} from "@/lib/patient-field-formatters";
import { onlyDigits } from "@/lib/patient-registration-schema";
import type { RegistrationFormValues, RegistrationPayload } from "@/lib/patient-registration-schema";

const YES_NO_PRIVATE = [["sim", "Sim"], ["nao", "Não"], ["prefiro_nao_informar", "Prefiro não informar"]] as const;

export function CompletePatientFields({ step }: { step?: number }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<RegistrationFormValues>();
  const [postalCodeStatus, setPostalCodeStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const values = watch();
  const show = (target: number) => step === undefined || step === target;
  const selectedGender = genderSelection(values.gender);
  const masked = (field: "cpf" | "postal_code" | "phone" | "guardian_phone" | "emergency_phone", formatter: (value: string) => string) => ({
    ...register(field),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(field, formatter(event.target.value), { shouldDirty: true, shouldValidate: true }),
  });
  const lookupPostalCode = async () => {
    const postalCode = onlyDigits(values.postal_code);
    if (postalCode.length !== 8) return;
    setPostalCodeStatus("loading");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
      if (!response.ok) throw new Error("postal-code-lookup-failed");
      const address = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (address.erro) {
        setPostalCodeStatus("not-found");
        return;
      }
      setValue("street", address.logradouro ?? "", { shouldDirty: true });
      setValue("neighborhood", address.bairro ?? "", { shouldDirty: true });
      setValue("city", address.localidade ?? "", { shouldDirty: true, shouldValidate: true });
      setValue("state", address.uf ?? "", { shouldDirty: true, shouldValidate: true });
      setPostalCodeStatus("found");
    } catch {
      setPostalCodeStatus("not-found");
    }
  };
  return <div className="grid gap-5 sm:grid-cols-2">
    {show(0) && <><Field id="full_name" label="Nome completo" error={errors.full_name?.message} wide><Input id="full_name" autoComplete="name" {...register("full_name")} /></Field><Field id="email" label="E-mail" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" {...register("email")} /></Field><Field id="birth_date" label="Data de nascimento" error={errors.birth_date?.message}><Input id="birth_date" type="date" {...register("birth_date")} /></Field><Field id="cpf" label="CPF" error={errors.cpf?.message}><Input id="cpf" inputMode="numeric" {...masked("cpf", formatCpf)} /></Field><Choice label="Faixa etária" value={values.age_group} onChange={(v) => setValue("age_group", v as RegistrationPayload["age_group"])} options={[["crianca", "Criança"], ["adolescente", "Adolescente"], ["adulto", "Adulto"]]} /><Field id="phone" label="Telefone" optional><Input id="phone" type="tel" autoComplete="tel" {...masked("phone", formatPhone)} /></Field><Choice label="Sexo" value={selectedGender} onChange={(value) => setValue("gender", value === "Outro" ? "" : value, { shouldDirty: true, shouldValidate: true })} options={GENDER_OPTIONS.map((option) => [option, option] as const)} />{selectedGender === "Outro" && <Field id="gender" label="Como você prefere informar?" optional><Input id="gender" value={values.gender ?? ""} onChange={(event) => setValue("gender", event.target.value, { shouldDirty: true, shouldValidate: true })} /></Field>}<Field id="marital_status" label="Estado civil" optional><Input id="marital_status" {...register("marital_status")} /></Field><Field id="education" label="Escolaridade" optional><Input id="education" {...register("education")} /></Field><Field id="occupation" label="Profissão/ocupação" optional><Input id="occupation" {...register("occupation")} /></Field></>}
    {show(1) && <><Field id="postal_code" label="CEP" error={errors.postal_code?.message}><div className="relative"><Input id="postal_code" inputMode="numeric" autoComplete="postal-code" {...masked("postal_code", formatPostalCode)} onBlur={() => void lookupPostalCode()} className="pr-10" />{postalCodeStatus === "loading" ? <LoaderCircle className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" /> : postalCodeStatus === "found" ? <MapPin className="absolute right-3 top-2.5 size-4 text-primary" /> : null}</div>{postalCodeStatus === "not-found" ? <p className="mt-1 text-xs text-muted-foreground">Não foi possível consultar o CEP. Preencha o endereço manualmente.</p> : null}</Field><Field id="street" label="Logradouro" optional><Input id="street" autoComplete="street-address" {...register("street")} /></Field><Field id="address_number" label="Número" optional><Input id="address_number" {...register("address_number")} /></Field><Field id="address_complement" label="Complemento" optional><Input id="address_complement" {...register("address_complement")} /></Field><Field id="neighborhood" label="Bairro" optional><Input id="neighborhood" {...register("neighborhood")} /></Field><Field id="city" label="Cidade" error={errors.city?.message}><Input id="city" autoComplete="address-level2" {...register("city")} /></Field><Field id="state" label="UF" error={errors.state?.message}><Input id="state" maxLength={2} className="uppercase" autoComplete="address-level1" {...register("state", { onChange: (event) => setValue("state", event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true }) })} /></Field></>}
    {show(2) && <><div className="sm:col-span-2"><h2 className="font-semibold">Contato de emergência</h2><p className="text-sm text-muted-foreground">Opcional, mas útil em situações necessárias.</p></div><Field id="emergency_name" label="Nome" optional><Input id="emergency_name" {...register("emergency_name")} /></Field><Field id="emergency_relationship" label="Relação" optional><Input id="emergency_relationship" {...register("emergency_relationship")} /></Field><Field id="emergency_phone" label="Telefone" optional><Input id="emergency_phone" type="tel" {...masked("emergency_phone", formatPhone)} /></Field><Field id="emergency_notes" label="Observações" optional><Input id="emergency_notes" {...register("emergency_notes")} /></Field>{values.age_group !== "adulto" && <><div className="sm:col-span-2 mt-2"><h2 className="font-semibold">Responsável legal</h2></div><Field id="guardian_name" label="Nome do responsável" error={errors.guardian_name?.message}><Input id="guardian_name" {...register("guardian_name")} /></Field><Field id="guardian_relationship" label="Relação" optional><Input id="guardian_relationship" {...register("guardian_relationship")} /></Field><Field id="guardian_phone" label="Telefone" optional><Input id="guardian_phone" type="tel" {...masked("guardian_phone", formatPhone)} /></Field><Field id="guardian_email" label="E-mail" error={errors.guardian_email?.message} optional><Input id="guardian_email" type="email" {...register("guardian_email")} /></Field></>}</>}
    {show(3) && <><Field id="therapy_reason" label="O que motivou a busca por atendimento?" error={errors.therapy_reason?.message} wide><Textarea id="therapy_reason" rows={5} {...register("therapy_reason")} /></Field><Choice label="Já fez terapia antes?" value={values.previous_therapy} onChange={(v) => setValue("previous_therapy", v as RegistrationPayload["previous_therapy"])} options={YES_NO_PRIVATE} wide />{values.previous_therapy === "sim" && <Field id="previous_therapy_details" label="Conte brevemente sobre essa experiência" error={errors.previous_therapy_details?.message} wide><Textarea id="previous_therapy_details" rows={3} {...register("previous_therapy_details")} /></Field>}</>}
    {show(4) && <><Choice label="Algum profissional já comunicou um diagnóstico?" value={values.medical_diagnosis} onChange={(v) => setValue("medical_diagnosis", v as RegistrationPayload["medical_diagnosis"])} options={YES_NO_PRIVATE} wide />{values.medical_diagnosis === "sim" && <Field id="medical_diagnosis_details" label="Qual?" error={errors.medical_diagnosis_details?.message} wide><Textarea id="medical_diagnosis_details" {...register("medical_diagnosis_details")} /></Field>}<Choice label="Usa medicamentos atualmente?" value={values.medication_use} onChange={(v) => setValue("medication_use", v as RegistrationPayload["medication_use"])} options={YES_NO_PRIVATE} wide />{values.medication_use === "sim" && <Field id="medication_details" label="Quais medicamentos?" error={errors.medication_details?.message} wide><Textarea id="medication_details" {...register("medication_details")} /></Field>}<Choice label="Há histórico familiar relacionado à saúde mental?" value={values.family_mental_health} onChange={(v) => setValue("family_mental_health", v as RegistrationPayload["family_mental_health"])} options={[["sim", "Sim"], ["nao", "Não"], ["nao_sei", "Não sei"], ["prefiro_nao_informar", "Prefiro não informar"]]} wide />{values.family_mental_health === "sim" && <Field id="family_mental_health_details" label="Conte apenas o que souber" error={errors.family_mental_health_details?.message} wide><Textarea id="family_mental_health_details" {...register("family_mental_health_details")} /></Field>}<Choice label="Preferência de pagamento" value={values.payment_preference} onChange={(v) => setValue("payment_preference", v as RegistrationPayload["payment_preference"])} options={[["", "Não informado"], ["dinheiro", "Dinheiro"], ["pix", "Pix"], ["cartao", "Cartão"]]} /><Choice label="Como conheceu o profissional?" value={values.referral_source} onChange={(v) => setValue("referral_source", v as RegistrationPayload["referral_source"])} options={[["", "Não informado"], ["indicacao", "Indicação"], ["outro_profissional", "Outro profissional"], ["anuncio", "Anúncio"], ["instagram", "Instagram"], ["google", "Google"], ["facebook", "Facebook"], ["outro", "Outro"]]} />{values.referral_source === "outro" && <Field id="referral_source_other" label="Outra origem" error={errors.referral_source_other?.message} wide><Input id="referral_source_other" {...register("referral_source_other")} /></Field>}</>}
  </div>;
}

function Field({ id, label, children, error, optional, wide }: { id: string; label: string; children: React.ReactNode; error?: string | undefined; optional?: boolean | undefined; wide?: boolean | undefined }) { return <div className={wide ? "sm:col-span-2" : ""}><FormField id={id} label={label} required={!optional} optional={Boolean(optional)}>{children}</FormField>{error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}</div>; }
function Choice({ label, value, onChange, options, wide }: { label: string; value: string | undefined; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; wide?: boolean | undefined }) { const selected = value || "__none"; return <div className={wide ? "sm:col-span-2" : ""}><FormField label={label} required><Select value={selected} onValueChange={(next) => onChange(next === "__none" ? "" : next)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([key, text]) => <SelectItem key={key || "empty"} value={key || "__none"}>{text}</SelectItem>)}</SelectContent></Select></FormField></div>; }