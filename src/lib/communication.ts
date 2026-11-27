export const communicationCategories = {
  important: "Aviso importante",
  administrative: "Comunicado administrativo",
  maintenance: "Manutenção programada",
  technical: "Problema técnico",
  update: "Atualização do sistema",
  news: "Novidade ou nova funcionalidade",
  guidance: "Orientação de uso",
  support: "Suporte ao usuário",
} as const;

export type CommunicationCategory = keyof typeof communicationCategories;
export type CommunicationAudience = "individual" | "all" | "trial";
export type CommunicationFilter = "all" | "waiting" | "unread" | "priority" | "archived";
export type CommunicationStatus = "waiting_professional" | "waiting_admin" | "archived";

export interface CommunicationConversation {
  id: string;
  recipient_id: string | null;
  professional_name: string;
  subject: string;
  category: CommunicationCategory;
  priority: boolean;
  created_at: string;
  last_message_at: string;
  last_body: string;
  status: CommunicationStatus;
  unread: number;
  initial_read_at: string | null;
  audience: CommunicationAudience;
  batch_id: string;
}

export interface CommunicationMessage {
  id: string;
  author: "admin" | "professional";
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface CommunicationRecipient {
  id: string;
  full_name: string;
}

export interface CommunicationDraft {
  audience: CommunicationAudience;
  recipient: string | null;
  subject: string;
  category: CommunicationCategory;
  priority: boolean;
  body: string;
}

export const communicationStatus = {
  waiting_professional: "Aguardando profissional",
  waiting_admin: "Aguardando administração",
  archived: "Arquivada",
} satisfies Record<CommunicationStatus, string>;

const communicationDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatCommunicationDate(value: string) {
  return communicationDate.format(new Date(value));
}
