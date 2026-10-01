import { useState, type FormEvent } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openDocument, useDocuments, useUploadDocument } from "@/lib/data";
import { DOCUMENT_CATEGORIES, formatDate, labelOf, type DocumentCategory } from "@/lib/domain";

export function DocumentsPanel({ patientId }: { patientId: string }) {
  const { data: documents } = useDocuments(patientId);
  const upload = useUploadDocument();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("clinico");
  const [file, setFile] = useState<File | null>(null);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Selecione um arquivo.");
      return;
    }
    try {
      await upload.mutateAsync({ file, patientId, title: title || file.name, category });
      toast.success("Documento anexado.");
      setTitle("");
      setFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível anexar.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="surface grid gap-3 p-5 sm:grid-cols-4">
        <Input className="sm:col-span-2" placeholder="Título do documento" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <Button type="submit" className="gap-2 sm:col-span-4" disabled={upload.isPending}>
          <Upload className="size-4" />
          Anexar documento
        </Button>
      </form>

      <div className="space-y-2.5">
        {(documents ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : null}
        {(documents ?? []).map((document) => (
          <button
            key={document.id}
            onClick={() => openDocument(document.storage_path).catch(() => toast.error("Não foi possível abrir o arquivo."))}
            className="surface flex w-full items-center gap-3 p-4 text-left"
          >
            <FileText className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{document.title}</span>
              <span className="block text-xs text-muted-foreground">{formatDate(document.created_at)} · {labelOf(DOCUMENT_CATEGORIES, document.category)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}