import type { Database } from "@/integrations/supabase/types";

export type LocationType = Database["public"]["Enums"]["location_type"];
export type AgeGroup = Database["public"]["Enums"]["age_group"];
export type PatientStatus = Database["public"]["Enums"]["patient_status"];
export type AppointmentType = Database["public"]["Enums"]["appointment_type"];
export type AppointmentModality = Database["public"]["Enums"]["appointment_modality"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type DocumentCategory = Database["public"]["Enums"]["document_category"];
export type CareMode = Database["public"]["Enums"]["care_mode"];

export const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: "consultorio_proprio", label: "Consultório próprio" },
  { value: "clinica", label: "Clínica" },
  { value: "instituicao", label: "Instituição" },
  { value: "domiciliar", label: "Atendimento domiciliar" },
  { value: "online", label: "Online" },
  { value: "outro", label: "Outro" },
];

export const AGE_GROUPS: { value: AgeGroup; label: string; hint: string }[] = [
  { value: "crianca", label: "Criança", hint: "Inclui dados do responsável" },
  { value: "adolescente", label: "Adolescente", hint: "Inclui dados do responsável" },
  { value: "adulto", label: "Adulto", hint: "Somente dados do paciente" },
];

export const PATIENT_STATUSES: { value: PatientStatus; label: string }[] = [
  { value: "ativo", label: "Em acompanhamento" },
  { value: "avaliacao", label: "Em avaliação" },
  { value: "alta", label: "Alta" },
  { value: "inativo", label: "Inativo" },
];

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: "atendimento_clinico", label: "Atendimento clínico" },
  { value: "devolutiva", label: "Devolutiva" },
  { value: "reuniao_responsaveis", label: "Reunião com pais/responsáveis" },
  { value: "reuniao_escolar", label: "Reunião escolar" },
  { value: "anamnese", label: "Anamnese" },
  { value: "outro", label: "Outro" },
];

export const APPOINTMENT_MODALITIES: { value: AppointmentModality; label: string }[] = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "domiciliar", label: "Domiciliar" },
  { value: "outro", label: "Outro" },
];

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "realizado", label: "Realizado" },
  { value: "falta", label: "Falta" },
  { value: "cancelado", label: "Cancelado" },
];

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const BLOCK_CATEGORIES = [
  { value: "ferias", label: "Férias" },
  { value: "feriado", label: "Feriado" },
  { value: "compromisso", label: "Compromisso" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
] as const;

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "clinico", label: "Documento clínico" },
  { value: "administrativo", label: "Documento administrativo" },
  { value: "anexo", label: "Anexo" },
  { value: "outro", label: "Outro" },
];

export const PROFESSIONS = [
  "Psicologia",
  "Psicopedagogia",
  "Neuropsicopedagogia",
  "Fonoaudiologia",
  "Psicanálise",
  "Neuropsicanálise",
  "Terapia",
  "Outra",
];

export function labelOf<T extends string>(list: { value: T; label: string }[], value?: T | null) {
  if (!value) return "—";
  return list.find((item) => item.value === value)?.label ?? "—";
}

export function ageFromBirthDate(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateLong(iso: string | Date) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function toDateInput(date: Date) {
  return toLocalInputValue(date).slice(0, 10);
}

export function toTimeInput(date: Date) {
  return toLocalInputValue(date).slice(11, 16);
}
