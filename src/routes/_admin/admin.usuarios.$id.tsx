import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired screen: its functions now live in "Profissionais e Assinaturas".
export const Route = createFileRoute("/_admin/admin/usuarios/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/admin/profissionais/$id", params: { id: params.id }, replace: true });
  },
});
