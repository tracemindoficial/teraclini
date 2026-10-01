import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type Location = Tables["locations"]["Row"];
export type Patient = Tables["patients"]["Row"];
export type Guardian = Tables["guardians"]["Row"];
export type Appointment = Tables["appointments"]["Row"];
export type Anamnesis = Tables["anamneses"]["Row"];
export type Evolution = Tables["evolutions"]["Row"];
export type PatientDocument = Tables["documents"]["Row"];
export type Room = Tables["rooms"]["Row"];
export type CustomAppointmentType = Tables["appointment_types"]["Row"];

export type AppointmentWithRefs = Appointment & {
  patient: Pick<Patient, "id" | "full_name"> | null;
  location: Pick<Location, "id" | "name" | "type"> | null;
  room: Pick<Room, "id" | "name"> | null;
  appointment_type: Pick<CustomAppointmentType, "id" | "name" | "color_key"> | null;
};

export const APPOINTMENT_SELECT =
  "*, patient:patients(id, full_name), location:locations(id, name, type), room:rooms(id, name), appointment_type:appointment_types(id, name, color_key)";

export async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  return data as T;
}
