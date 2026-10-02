import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — TeraClini" },
      { name: "description", content: "Condições gerais para utilização da plataforma TeraClini." },
      { property: "og:title", content: "Termos de Uso — TeraClini" },
      {
        property: "og:description",
        content: "Condições gerais para utilização da plataforma TeraClini.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="surface mx-auto max-w-3xl p-6 sm:p-10">
        <BrandLogo className="w-44" />
        <h1 className="mt-8 text-3xl font-semibold">Termos de Uso</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-muted-foreground">
          <p>
            Estes termos apresentam as condições gerais de acesso ao TeraClini, uma plataforma de
            apoio à organização da prática de profissionais independentes.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Uso profissional</h2>
          <p>
            O profissional é responsável pelas informações inseridas, pela base legal aplicável ao
            tratamento dos dados e pela utilização do sistema de acordo com suas obrigações éticas e
            profissionais.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Conta e acesso</h2>
          <p>
            O acesso é pessoal. As credenciais devem ser mantidas em segurança e não devem ser
            compartilhadas. Atividades realizadas na conta permanecem vinculadas ao respectivo
            espaço profissional.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Disponibilidade e licenças</h2>
          <p>
            Planos, valores, periodicidade, condições de pagamento e cancelamento são apresentados
            antes da contratação. Na ausência de licença ativa, nenhuma contratação ou cobrança é
            processada.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Limites do serviço</h2>
          <p>
            O TeraClini organiza informações e fluxos de trabalho. A plataforma não substitui
            julgamento profissional, não realiza diagnóstico automático e não presta atendimento
            clínico.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Privacidade</h2>
          <p>
            O tratamento de dados deve observar a legislação aplicável e a Política de Privacidade
            do TeraClini.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/privacidade">Política de Privacidade</Link>
          </Button>
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </article>
    </main>
  );
}
