import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { SupportPage } from "@/components/support/SupportPage";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — TeraClini" },
      { name: "description", content: "Acompanhe seus chamados de suporte no TeraClini." },
      { property: "og:title", content: "Suporte — TeraClini" },
      { property: "og:description", content: "Acompanhe seus chamados de suporte no TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="Suporte" description="Seus chamados e conversas com a equipe">
      <SupportPage />
    </AppShell>
  ),
});
