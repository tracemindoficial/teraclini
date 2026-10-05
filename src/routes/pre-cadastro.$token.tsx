import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RegistrationForm } from "@/components/patient-registration/RegistrationForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { checkPatientRegistrationLink } from "@/lib/patient-registration.functions";

export const Route = createFileRoute("/pre-cadastro/$token")({
  head: () => ({
    meta: [
      { title: "Pré-cadastro seguro — TeraClini" },
      {
        name: "description",
        content: "Envie seus dados com segurança para o profissional responsável pelo atendimento.",
      },
      { property: "og:title", content: "Pré-cadastro seguro — TeraClini" },
      {
        property: "og:description",
        content: "Envie seus dados com segurança para o profissional responsável pelo atendimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});
function Page() {
  const { token } = Route.useParams();
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["public-registration-link", token],
    queryFn: () => checkPatientRegistrationLink({ data: { token } }),
    retry: false,
  });
  if (isLoading) return <Status title="Verificando link seguro..." />;
  if (isError)
    return (
      <Status
        title="Não foi possível verificar o link"
        description="Confira sua conexão e tente novamente."
        action={
          <Button
            type="button"
            variant="link"
            className="mt-3"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Tentando novamente..." : "Tentar novamente"}
          </Button>
        }
      />
    );
  if (!data?.available)
    return (
      <Status
        title="Este link não está disponível"
        description="Ele pode ter expirado, sido revogado ou já ter sido utilizado. Solicite um novo link ao profissional."
      />
    );
  return <RegistrationForm token={token} />;
}

function Status({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg text-center">
        <BrandLogo className="mx-auto w-44" />
        <div className="surface mt-10 p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
          {action}
          <Link
            to="/privacidade"
            className="mt-5 inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            Privacidade e proteção de dados
          </Link>
        </div>
      </div>
    </main>
  );
}
