import { createFileRoute } from "@tanstack/react-router";

import { ProfessionalDetail } from "@/components/admin/professionals/ProfessionalDetail";

export const Route = createFileRoute("/_admin/admin/profissionais/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do profissional — Administração TeraClini" },
      { name: "description", content: "Perfil, acesso, assinatura, financeiro e histórico do profissional." },
      { property: "og:title", content: "Ficha do profissional — Administração TeraClini" },
      { property: "og:description", content: "Perfil, acesso, assinatura, financeiro e histórico do profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  return <ProfessionalDetail key={id} id={id} />;
}
