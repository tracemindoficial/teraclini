import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired screen: its functions now live in "Profissionais e Assinaturas".
export const Route = createFileRoute("/_admin/admin/assinaturas")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/profissionais", replace: true });
  },
});
