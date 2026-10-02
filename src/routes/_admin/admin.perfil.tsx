import { createFileRoute } from "@tanstack/react-router";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { useAdminSelf } from "@/lib/data/admin";

export const Route = createFileRoute("/_admin/admin/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Administração TeraClini" },
      { name: "description", content: "Perfil do administrador da plataforma." },
      { property: "og:title", content: "Meu perfil — Administração TeraClini" },
      { property: "og:description", content: "Perfil do administrador da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { data, isLoading, error } = useAdminSelf();
  return (
    <AdminShell title="Meu perfil" description="Identidade usada na Central administrativa">
      {isLoading ? (
        <AdminState kind="loading">Carregando perfil...</AdminState>
      ) : error || !data ? (
        <AdminState kind="error">Não foi possível carregar o perfil.</AdminState>
      ) : (
        <dl className="surface max-w-2xl divide-y p-6">
          <ProfileRow label="Nome" value={data.name} />
          <ProfileRow label="E-mail" value={data.email} />
          <ProfileRow label="Permissão" value="Administrador master" />
          <ProfileRow
            label="Último acesso"
            value={data.lastSignInAt ? new Date(data.lastSignInAt).toLocaleString("pt-BR") : "—"}
          />
        </dl>
      )}
    </AdminShell>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
