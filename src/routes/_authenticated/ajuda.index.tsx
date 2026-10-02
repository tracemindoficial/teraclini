import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { HelpCenterPage } from "@/components/help/HelpCenterPage";
export const Route = createFileRoute("/_authenticated/ajuda/")({
  head: () => ({
    meta: [
      { title: "Central de Ajuda — TeraClini" },
      { name: "description", content: "Tutoriais e respostas para usar o TeraClini." },
      { property: "og:title", content: "Central de Ajuda — TeraClini" },
      { property: "og:description", content: "Tutoriais e respostas para usar o TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="Central de Ajuda" description="Tutoriais e respostas para sua rotina">
      <HelpCenterPage />
    </AppShell>
  ),
});
