import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type Location = Tables["locations"]["Row"];
export type Patient = Tables["patients"]["Row"];
export type Guardian = Tables["guardians"]["Row"];
export type Appointment = Tables["appointments"]["Row"];
export type Anamnesis = Tables["anamneses"]["Row"];
export type Evolution = Tables["evolutions"]["Row"];
export type PatientDocument = Tables["documents"]["Row"];

export type AppointmentWithRefs = Appointment & {
  patient: Pick<Patient, "id" | "full_name"> | null;
  location: Pick<Location, "id" | "name" | "type"> | null;
};

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/* ---------------- profile ---------------- */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const userId = await currentUserId();
      const result = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Tables["profiles"]["Update"]) => {
      const userId = await currentUserId();
      const result = await supabase
        .from("profiles")
        .upsert({ id: userId, ...values })
        .select()
        .single();
      return unwrap(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/* ---------------- locations ---------------- */

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () =>
      unwrap(await supabase.from("locations").select("*").order("name")) as Location[],
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["locations"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      const result = await supabase
        .from("locations")
        .upsert({ ...values, user_id: userId })
        .select()
        .single();
      return unwrap(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

/* ---------------- patients ---------------- */

export function usePatients(search?: string) {
  return useQuery({
    queryKey: ["patients", search ?? ""],
    queryFn: async () => {
      let query = supabase.from("patients").select("*").order("full_name");
      if (search && search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);
      return unwrap(await query) as Patient[];
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: async () => unwrap(await supabase.from("patients").select("*").eq("id", id).single()) as Patient,
  });
}

export function useSavePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["patients"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      const result = await supabase
        .from("patients")
        .upsert({ ...values, user_id: userId })
        .select()
        .single();
      return unwrap(result) as Patient;
    },
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", patient.id] });
    },
  });
}

export function useGuardians(patientId: string) {
  return useQuery({
    queryKey: ["guardians", patientId],
    queryFn: async () =>
      unwrap(
        await supabase.from("guardians").select("*").eq("patient_id", patientId).order("created_at"),
      ) as Guardian[],
    enabled: Boolean(patientId),
  });
}

export function useSaveGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["guardians"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase.from("guardians").upsert({ ...values, user_id: userId }).select().single(),
      ) as Guardian;
    },
    onSuccess: (guardian) => qc.invalidateQueries({ queryKey: ["guardians", guardian.patient_id] }),
  });
}

export function useDeleteGuardian(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guardians").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guardians", patientId] }),
  });
}

/* ---------------- appointments ---------------- */

const APPOINTMENT_SELECT =
  "*, patient:patients(id, full_name), location:locations(id, name, type)";

export function useAppointments(params: { from: string; to: string; locationId?: string }) {
  return useQuery({
    queryKey: ["appointments", params.from, params.to, params.locationId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .gte("starts_at", params.from)
        .lt("starts_at", params.to)
        .order("starts_at");
      if (params.locationId) query = query.eq("location_id", params.locationId);
      return unwrap(await query) as unknown as AppointmentWithRefs[];
    },
  });
}

export function usePatientAppointments(patientId: string) {
  return useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("appointments")
          .select(APPOINTMENT_SELECT)
          .eq("patient_id", patientId)
          .order("starts_at", { ascending: false }),
      ) as unknown as AppointmentWithRefs[],
    enabled: Boolean(patientId),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ["appointment", id],
    queryFn: async () =>
      unwrap(
        await supabase.from("appointments").select(APPOINTMENT_SELECT).eq("id", id).single(),
      ) as unknown as AppointmentWithRefs,
    enabled: Boolean(id),
  });
}

export function useSaveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Omit<Tables["appointments"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase.from("appointments").upsert({ ...values, user_id: userId }).select().single(),
      ) as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
      qc.invalidateQueries({ queryKey: ["pending-evolutions"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

/* ---------------- clinical records ---------------- */

export function useEvolutions(patientId: string) {
  return useQuery({
    queryKey: ["evolutions", patientId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("evolutions")
          .select("*")
          .eq("patient_id", patientId)
          .order("recorded_at", { ascending: false }),
      ) as Evolution[],
    enabled: Boolean(patientId),
  });
}

export function useEvolutionByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ["evolution-by-appointment", appointmentId],
    queryFn: async () => {
      const result = await supabase
        .from("evolutions")
        .select("*")
        .eq("appointment_id", appointmentId)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data as Evolution | null;
    },
    enabled: Boolean(appointmentId),
  });
}

export function useSaveEvolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Omit<Tables["evolutions"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase
          .from("evolutions")
          .upsert({ ...values, user_id: userId }, { onConflict: "appointment_id" })
          .select()
          .single(),
      ) as Evolution;
    },
    onSuccess: (evolution) => {
      qc.invalidateQueries({ queryKey: ["evolutions", evolution.patient_id] });
      qc.invalidateQueries({ queryKey: ["evolution-by-appointment", evolution.appointment_id] });
      qc.invalidateQueries({ queryKey: ["pending-evolutions"] });
    },
  });
}

export function useAnamneses(patientId: string) {
  return useQuery({
    queryKey: ["anamneses", patientId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("anamneses")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
      ) as Anamnesis[],
    enabled: Boolean(patientId),
  });
}

export function useSaveAnamnesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Tables["anamneses"]["Insert"], "user_id"> & { id?: string }) => {
      const userId = await currentUserId();
      return unwrap(
        await supabase.from("anamneses").upsert({ ...values, user_id: userId }).select().single(),
      ) as Anamnesis;
    },
    onSuccess: (anamnesis) => qc.invalidateQueries({ queryKey: ["anamneses", anamnesis.patient_id] }),
  });
}

export function useDocuments(patientId?: string) {
  return useQuery({
    queryKey: ["documents", patientId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (patientId) query = query.eq("patient_id", patientId);
      return unwrap(await query) as PatientDocument[];
    },
  });
}

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 20 * 1024 * 1024;

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      patientId: string;
      title: string;
      category: Database["public"]["Enums"]["document_category"];
    }) => {
      if (!ALLOWED_MIME.includes(input.file.type)) {
        throw new Error("Tipo de arquivo não permitido. Use PDF, imagem ou documento de texto.");
      }
      if (input.file.size > MAX_SIZE) throw new Error("O arquivo deve ter no máximo 20 MB.");

      const userId = await currentUserId();
      const path = `${userId}/${input.patientId}/${crypto.randomUUID()}-${input.file.name}`;
      const upload = await supabase.storage.from("patient-documents").upload(path, input.file);
      if (upload.error) throw new Error("Não foi possível enviar o arquivo.");

      return unwrap(
        await supabase
          .from("documents")
          .insert({
            user_id: userId,
            patient_id: input.patientId,
            title: input.title,
            category: input.category,
            storage_path: path,
            mime_type: input.file.type,
            size_bytes: input.file.size,
          })
          .select()
          .single(),
      ) as PatientDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (document: PatientDocument) => {
      await supabase.storage.from("patient-documents").remove([document.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", document.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export async function openDocument(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(storagePath, 60);
  if (error || !data) throw new Error("Não foi possível abrir o arquivo.");
  window.open(data.signedUrl, "_blank", "noopener");
}

/* ---------------- dashboard ---------------- */

export function usePendingEvolutions() {
  return useQuery({
    queryKey: ["pending-evolutions"],
    queryFn: async () => {
      const appointments = unwrap(
        await supabase
          .from("appointments")
          .select(APPOINTMENT_SELECT)
          .lt("starts_at", new Date().toISOString())
          .in("status", ["agendado", "confirmado", "realizado"])
          .order("starts_at", { ascending: false })
          .limit(30),
      ) as unknown as AppointmentWithRefs[];

      const ids = appointments.map((a) => a.id);
      if (ids.length === 0) return [];
      const evolutions = unwrap(
        await supabase.from("evolutions").select("appointment_id").in("appointment_id", ids),
      ) as { appointment_id: string }[];
      const done = new Set(evolutions.map((e) => e.appointment_id));
      return appointments.filter((a) => a.patient_id && !done.has(a.id));
    },
  });
}

export function useGlobalSearch(term: string) {
  return useQuery({
    queryKey: ["global-search", term],
    queryFn: async () => {
      const like = `%${term.trim()}%`;
      const [patients, locations, documents] = await Promise.all([
        supabase.from("patients").select("id, full_name, status").ilike("full_name", like).limit(8),
        supabase.from("locations").select("id, name, type").ilike("name", like).limit(5),
        supabase.from("documents").select("id, title, patient_id").ilike("title", like).limit(5),
      ]);
      return {
        patients: (patients.data ?? []) as Pick<Patient, "id" | "full_name" | "status">[],
        locations: (locations.data ?? []) as Pick<Location, "id" | "name" | "type">[],
        documents: (documents.data ?? []) as Pick<PatientDocument, "id" | "title" | "patient_id">[],
      };
    },
    enabled: term.trim().length >= 2,
  });
}
