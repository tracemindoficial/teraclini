import { createFileRoute } from "@tanstack/react-router";

import { ProfessionalsCentral } from "@/components/admin/professionals/ProfessionalsCentral";

export const Route = createFileRoute("/_admin/admin/profissionais/")({
  head: () => ({
    meta: [
      { title: "Profissionais e Assinaturas — Administração TeraClini" },
      { name: "description", content: "Central única de profissionais, degustações, assinaturas e pagamentos." },
      { property: "og:title", content: "Profissionais e Assinaturas — Administração TeraClini" },
      { property: "og:description", content: "Central única de profissionais, degustações, assinaturas e pagamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProfessionalsCentral,
});
