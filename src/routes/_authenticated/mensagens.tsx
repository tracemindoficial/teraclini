import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CommunicationCenter } from "@/components/communication/CommunicationCenter";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({ meta: [{ title: "Mensagens da Administração — TeraClini" }] }),
  component: () => (
    <AppShell title="Mensagens da Administração" description="Comunicados e conversas privadas com o TeraClini.">
      <CommunicationCenter />
    </AppShell>
  ),
});
