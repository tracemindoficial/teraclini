import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveAnamnesis, type Anamnesis } from "@/lib/data";

/**
 * Modelos de anamnese. A estrutura é flexível por profissão: cada modelo é
 * apenas uma lista de blocos, guardados como conteúdo livre no banco.
 */
export const ANAMNESIS_TEMPLATES: Record<string, { label: string; sections: string[] }> = {
  geral: {
    label: "Geral",
    sections: [
      "Identificação",
      "Queixa principal",
      "Histórico",
      "Desenvolvimento",
      "Contexto familiar",
      "Contexto escolar/profissional",
      "Aspectos relevantes",
      "Observações",
      "Encaminhamentos",
    ],
  },
  infantil: {
    label: "Infantil",
    sections: [
      "Identificação",
      "Queixa principal",
      "Gestação e parto",
      "Desenvolvimento neuropsicomotor",
      "Rotina e sono",
      "Contexto familiar",
      "Contexto escolar",
      "Observações",
      "Encaminhamentos",
    ],
  },
  adulto: {
    label: "Adulto",
    sections: [
      "Identificação",
      "Queixa principal",
      "Histórico de saúde",
      "Histórico de atendimentos anteriores",
      "Contexto familiar",
      "Contexto profissional",
      "Aspectos relevantes",
      "Observações",
      "Encaminhamentos",
    ],
  },
};

export function AnamnesisDialog({
  open,
  onOpenChange,
  patientId,
  anamnesis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  anamnesis?: Anamnesis | undefined;
}) {
  const saveAnamnesis = useSaveAnamnesis();
  const [title, setTitle] = useState("Anamnese");
  const [templateKey, setTemplateKey] = useState("geral");
  const [content, setContent] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(anamnesis?.title ?? "Anamnese");
    setTemplateKey(anamnesis?.template_key ?? "geral");
    setContent((anamnesis?.content as Record<string, string>) ?? {});
    setCompleted(anamnesis?.is_completed ?? false);
  }, [open, anamnesis]);

  const sections = ANAMNESIS_TEMPLATES[templateKey]?.sections ?? [];

  async function handleSubmit(event: FormEvent, markCompleted: boolean) {
    event.preventDefault();
    try {
      await saveAnamnesis.mutateAsync({
        ...(anamnesis ? { id: anamnesis.id } : {}),
        patient_id: patientId,
        title: title.trim() || "Anamnese",
        template_key: templateKey,
        content,
        is_completed: markCompleted,
      });
      toast.success(markCompleted ? "Anamnese concluída." : "Anamnese salva.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{anamnesis ? "Anamnese" : "Nova anamnese"}</DialogTitle>
          <DialogDescription>
            Preencha apenas o que fizer sentido para este caso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => handleSubmit(event, completed)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Select value={templateKey} onValueChange={setTemplateKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ANAMNESIS_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section} className="space-y-1.5">
              <Label>{section}</Label>
              <Textarea
                rows={3}
                value={content[section] ?? ""}
                onChange={(event) => setContent({ ...content, [section]: event.target.value })}
              />
            </div>
          ))}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saveAnamnesis.isPending}
              onClick={(event) => handleSubmit(event, false)}
            >
              Salvar rascunho
            </Button>
            <Button
              type="button"
              disabled={saveAnamnesis.isPending}
              onClick={(event) => {
                setCompleted(true);
                handleSubmit(event, true);
              }}
            >
              Concluir anamnese
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
