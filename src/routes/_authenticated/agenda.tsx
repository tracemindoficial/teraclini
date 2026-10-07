import { createFileRoute } from "@tanstack/react-router";
import { AgendaPage } from "@/components/appointments/AgendaPage";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [
    { title: "Minha Agenda semanal — TeraClini" },
    { name: "description", content: "Agenda privada semanal com horários, pacientes, locais, disponibilidade e bloqueios do profissional independente." },
    { property: "og:title", content: "Minha Agenda semanal — TeraClini" },
    { property: "og:description", content: "Organize seus atendimentos em uma grade de horários de segunda a domingo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AgendaPage,
});
