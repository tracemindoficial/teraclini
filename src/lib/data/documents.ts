import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { currentUserId, unwrap, type PatientDocument } from "./shared";
import { queryKeys } from "@/lib/query-keys";

export function useDocuments(patientId?: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.documents, patientId ?? "all"],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
  });
}

export async function openDocument(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(storagePath, 60);
  if (error || !data) throw new Error("Não foi possível abrir o arquivo.");
  window.open(data.signedUrl, "_blank", "noopener");
}
