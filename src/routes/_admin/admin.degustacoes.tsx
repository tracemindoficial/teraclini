import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";

export const Route = createFileRoute("/_admin/admin/degustacoes")({
  head: () => ({
    meta: [
      { title: "Assinaturas e Degustações — Administração TeraClini" },
      { name: "description", content: "Testes gratuitos, degustações, cobranças e acessos." },
      { property: "og:title", content: "Assinaturas e Degustações — Administração TeraClini" },
      { property: "og:description", content: "Testes gratuitos, degustações, cobranças e acessos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell
      title="Gestão de Assinaturas e Degustações"
      description="Testes, degustações, cobrança manual e liberação de acesso"
    >
      <SubscriptionManagement />
    </AdminShell>
  ),
});
