import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { MySubscriptionPage } from "@/components/subscription/MySubscriptionPage";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [
      { title: "Minha assinatura — TeraClini" },
      { name: "description", content: "Período gratuito, valores e contratação da sua assinatura TeraClini." },
      { property: "og:title", content: "Minha assinatura — TeraClini" },
      { property: "og:description", content: "Período gratuito, valores e contratação da sua assinatura TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="Minha assinatura" description="Período gratuito, valores e contratação">
      <MySubscriptionPage />
    </AppShell>
  ),
});
