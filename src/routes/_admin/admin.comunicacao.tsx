import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CommunicationCenter } from "@/components/communication/CommunicationCenter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_admin/admin/comunicacao")({
  beforeLoad: async () => {
    const { data, error } = await supabase.rpc("communication_is_admin");
    if (error || !data) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Central de Comunicação — TeraClini" }] }),
  component: () => (
    <AdminShell title="Central de Comunicação" description="Comunicados privados e conversas com profissionais.">
      <CommunicationCenter admin />
    </AdminShell>
  ),
});
