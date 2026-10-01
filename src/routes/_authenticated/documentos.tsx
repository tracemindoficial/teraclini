import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openDocument, useDocuments, usePatients } from "@/lib/data";
import { DOCUMENT_CATEGORIES, formatDate, labelOf } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Meus Documentos — TeraClini" },
      { name: "description", content: "Documentos privados do seu espaço profissional." },
      { property: "og:title", content: "Meus Documentos — TeraClini" },
      { property: "og:description", content: "Documentos privados do seu espaço profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments();
  const { data: patients } = usePatients();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");

  const patientName = (id: string | null) =>
    patients?.find((patient) => patient.id === id)?.full_name ?? "Sem paciente";

  const filtered = (documents ?? []).filter((document) => {
    const matchesCategory = category === "todos" || document.category === category;
    const matchesSearch =
      !search.trim() || document.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AppShell title="Documentos" description="Arquivos guardados em área privada">
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar documento..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {DOCUMENT_CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 space-y-2.5">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && filtered.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            Nenhum documento. Anexe arquivos pelo perfil do paciente.
          </div>
        ) : null}
        {filtered.map((document) => (
          <div key={document.id} className="surface flex items-center gap-3 p-4">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <button
              onClick={() =>
                openDocument(document.storage_path).catch(() =>
                  toast.error("Não foi possível abrir o arquivo."),
                )
              }
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate font-medium">{document.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {formatDate(document.created_at)} · {patientName(document.patient_id)}
              </span>
            </button>
            <Badge variant="secondary" className="shrink-0">
              {labelOf(DOCUMENT_CATEGORIES, document.category)}
            </Badge>
            {document.patient_id ? (
              <Link
                to="/pacientes/$id"
                params={{ id: document.patient_id }}
                className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Abrir paciente
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
