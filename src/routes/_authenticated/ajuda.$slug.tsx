import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { HelpTutorialPage } from "@/components/help/HelpTutorialPage";
export const Route = createFileRoute("/_authenticated/ajuda/$slug")({
  head: () => ({
    meta: [
      { title: "Tutorial — Ajuda TeraClini" },
      { name: "description", content: "Orientação passo a passo para usar o TeraClini." },
      { property: "og:title", content: "Tutorial — Ajuda TeraClini" },
      { property: "og:description", content: "Orientação passo a passo para usar o TeraClini." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialRoute,
});
function TutorialRoute() {
  const { slug } = Route.useParams();
  return (
    <AppShell title="Tutorial" description="Siga as etapas no seu ritmo">
      <HelpTutorialPage slug={slug} />
    </AppShell>
  );
}
