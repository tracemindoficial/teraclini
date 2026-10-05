import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const choice = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (factor: number) => {
    let total = 0;
    for (let index = 0; index < factor - 1; index += 1) total += Number(cpf[index]) * (factor - index);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(10) === Number(cpf[9]) && digit(11) === Number(cpf[10]);
}

const completePatientFields = z.object({
    full_name: z.string().trim().min(3, "Informe seu nome completo.").max(150),
    email: z.string().trim().email("Informe um e-mail válido.").max(254),
    birth_date: z.string().date("Informe uma data de nascimento válida."),
    cpf: z.string().refine(isValidCpf, "Informe um CPF válido."),
    age_group: choice(["crianca", "adolescente", "adulto"]),
    gender: optionalText(80),
    marital_status: optionalText(80),
    education: optionalText(120),
    occupation: optionalText(120),
    phone: optionalText(30),
    postal_code: z.string().refine((value) => onlyDigits(value).length === 8, "Informe um CEP válido."),
    street: optionalText(180),
    address_number: optionalText(20),
    address_complement: optionalText(120),
    neighborhood: optionalText(120),
    city: z.string().trim().min(2, "Informe sua cidade.").max(120),
    state: z.string().trim().length(2, "Informe a UF com 2 letras."),
    guardian_name: optionalText(150),
    guardian_relationship: optionalText(80),
    guardian_phone: optionalText(30),
    guardian_email: z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido.").max(254)]).default(""),
    emergency_name: optionalText(150),
    emergency_relationship: optionalText(80),
    emergency_phone: optionalText(30),
    emergency_notes: optionalText(500),
    therapy_reason: z.string().trim().min(3, "Conte brevemente o motivo da sua busca.").max(3000),
    previous_therapy: choice(["sim", "nao", "prefiro_nao_informar"]),
    previous_therapy_details: optionalText(3000),
    medical_diagnosis: choice(["sim", "nao", "prefiro_nao_informar"]),
    medical_diagnosis_details: optionalText(3000),
    medication_use: choice(["sim", "nao", "prefiro_nao_informar"]),
    medication_details: optionalText(3000),
    family_mental_health: choice(["sim", "nao", "nao_sei", "prefiro_nao_informar"]),
    family_mental_health_details: optionalText(3000),
    payment_preference: z.union([choice(["dinheiro", "pix", "cartao"]), z.literal("")]).default(""),
    referral_source: z.union([choice(["indicacao", "outro_profissional", "anuncio", "instagram", "google", "facebook", "outro"]), z.literal("")]).default(""),
    referral_source_other: optionalText(180),
  });

function validateCompletePatient(
  value: z.infer<typeof completePatientFields>,
  context: z.RefinementCtx,
) {
    if (new Date(value.birth_date) >= new Date()) context.addIssue({ code: "custom", path: ["birth_date"], message: "A data de nascimento deve estar no passado." });
    if (value.age_group !== "adulto" && !value.guardian_name.trim()) context.addIssue({ code: "custom", path: ["guardian_name"], message: "Informe o nome do responsável." });
    if (value.previous_therapy === "sim" && !value.previous_therapy_details.trim()) context.addIssue({ code: "custom", path: ["previous_therapy_details"], message: "Conte brevemente sobre a terapia anterior." });
    if (value.medical_diagnosis === "sim" && !value.medical_diagnosis_details.trim()) context.addIssue({ code: "custom", path: ["medical_diagnosis_details"], message: "Informe qual diagnóstico foi comunicado a você." });
    if (value.medication_use === "sim" && !value.medication_details.trim()) context.addIssue({ code: "custom", path: ["medication_details"], message: "Informe o medicamento e a rotina de uso." });
    if (value.family_mental_health === "sim" && !value.family_mental_health_details.trim()) context.addIssue({ code: "custom", path: ["family_mental_health_details"], message: "Conte brevemente o que sabe sobre o caso." });
    if (value.referral_source === "outro" && !value.referral_source_other.trim()) context.addIssue({ code: "custom", path: ["referral_source_other"], message: "Conte como nos encontrou." });
}

export const completePatientSchema = completePatientFields.superRefine(validateCompletePatient);

export const registrationPayloadSchema = completePatientFields
  .extend({
    privacy_consent: z.boolean().refine((value) => value, "Confirme o aviso de privacidade para enviar."),
  })
  .superRefine(validateCompletePatient);

export const professionalPatientSchema = completePatientFields
  .extend({
    status: choice(["ativo", "inativo", "alta", "avaliacao"]),
    notes: optionalText(3000),
  })
  .superRefine(validateCompletePatient);

export type RegistrationPayload = z.infer<typeof registrationPayloadSchema>;
export type RegistrationFormValues = z.input<typeof registrationPayloadSchema>;
export type CompletePatientPayload = z.infer<typeof completePatientSchema>;
export type ProfessionalPatientPayload = z.infer<typeof professionalPatientSchema>;

export const EMPTY_REGISTRATION: RegistrationPayload = {
  full_name: "", email: "", birth_date: "", cpf: "", age_group: "adulto", gender: "", marital_status: "", education: "", occupation: "", phone: "",
  postal_code: "", street: "", address_number: "", address_complement: "", neighborhood: "", city: "", state: "",
  guardian_name: "", guardian_relationship: "", guardian_phone: "", guardian_email: "",
  emergency_name: "", emergency_relationship: "", emergency_phone: "", emergency_notes: "", therapy_reason: "",
  previous_therapy: "nao", previous_therapy_details: "", medical_diagnosis: "nao", medical_diagnosis_details: "",
  medication_use: "nao", medication_details: "", family_mental_health: "nao", family_mental_health_details: "",
  payment_preference: "", referral_source: "", referral_source_other: "", privacy_consent: false,
};
