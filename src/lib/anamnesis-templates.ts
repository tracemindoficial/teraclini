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