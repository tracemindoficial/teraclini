import { createFileRoute } from "@tanstack/react-router";

import { MarketingLanding } from "@/components/marketing/MarketingLanding";
import { getPublicPlans } from "@/lib/public-commercial.functions";
import { loadPublicPlans } from "@/lib/public-plans-loader";

export const Route = createFileRoute("/")({
  loader: () => loadPublicPlans(getPublicPlans),
  head: () => ({
    meta: [
      { title: "TeraClini — sua prática clínica, organizada para acompanhar você" },
      {
        name: "description",
        content:
          "Agenda, pacientes, locais e registros clínicos em um único espaço para psicólogos, psicopedagogos, fonoaudiólogos, psicanalistas e terapeutas independentes.",
      },
      { property: "og:title", content: "TeraClini — sua prática clínica em um só lugar" },
      {
        property: "og:description",
        content:
          "Uma agenda única para todos os lugares onde você atende. A clínica muda. Sua prática continua com você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { plans, unavailable } = Route.useLoaderData();
  return <MarketingLanding plans={plans} plansUnavailable={unavailable} />;
}
