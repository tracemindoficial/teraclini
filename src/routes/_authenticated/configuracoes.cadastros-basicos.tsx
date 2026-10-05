import { createFileRoute } from "@tanstack/react-router";
import { BasicRegistrationsPage } from "@/components/settings/BasicRegistrationsPage";

export const Route = createFileRoute("/_authenticated/configuracoes/cadastros-basicos")({
  head: () => ({ meta: [
    { title: "Cadastros Básicos — TeraClini" },
    { name: "description", content: "Especialidades, serviços e valores reutilizáveis da sua prática." },
    { property: "og:title", content: "Cadastros Básicos — TeraClini" },
    { property: "og:description", content: "Especialidades, serviços e valores reutilizáveis da sua prática." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: BasicRegistrationsPage,
});