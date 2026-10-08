import { createFileRoute } from "@tanstack/react-router";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PricingSection } from "@/components/marketing/MarketingLanding";
import { getPublicPlans } from "@/lib/public-commercial.functions";
import { loadPublicPlans } from "@/lib/public-plans-loader";

export const Route = createFileRoute("/planos")({
  loader: () => loadPublicPlans(getPublicPlans),
  head: () => ({
    meta: [
      { title: "Planos e licenças — TeraClini" },
      {
        name: "description",
        content:
          "Consulte as licenças disponíveis para organizar sua prática profissional com o TeraClini.",
      },
      { property: "og:title", content: "Planos e licenças — TeraClini" },
      {
        property: "og:description",
        content: "Consulte as licenças disponíveis para usar o TeraClini.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { plans, unavailable } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <PricingSection plans={plans} unavailable={unavailable} standalone />
      </main>
      <MarketingFooter />
    </div>
  );
}
