import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsageContent } from "@/components/admin/AdminUsageContent";
export const Route = createFileRoute("/_admin/admin/metricas")({
  head: () => ({
    meta: [
      { title: "Métricas — Administração TeraClini" },
      { name: "description", content: "Indicadores operacionais reais do TeraClini." },
      { property: "og:title", content: "Métricas — Administração TeraClini" },
      { property: "og:description", content: "Indicadores operacionais reais do TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell title="Métricas" description="Evolução da plataforma com dados reais">
      <AdminUsageContent mode="metrics" />
    </AdminShell>
  ),
});
