import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsageContent } from "@/components/admin/AdminUsageContent";
export const Route = createFileRoute("/_admin/admin/uso")({
  head: () => ({
    meta: [
      { title: "Uso do Sistema — Administração TeraClini" },
      { name: "description", content: "Uso real das funcionalidades do TeraClini." },
      { property: "og:title", content: "Uso do Sistema — Administração TeraClini" },
      { property: "og:description", content: "Uso real das funcionalidades do TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell title="Uso do Sistema" description="Atividade técnica sem conteúdo clínico">
      <AdminUsageContent mode="usage" />
    </AdminShell>
  ),
});
